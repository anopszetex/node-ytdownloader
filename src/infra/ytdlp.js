import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";
import { DownloadError } from "../core/errors.js";
import { selectFormat } from "../core/formats.js";

/** @typedef {import('../core/config.js').DownloadConfig} DownloadConfig */

/**
 * Build arguments separately so command construction stays testable.
 * @param {Readonly<DownloadConfig>} config
 */
export function buildYtdlpArgs(config) {
  const args = [
    "--no-playlist",
    "--continue",
    "--no-overwrites",
    "--newline",
    "--concurrent-fragments",
    String(config.connections),
    "--format",
    selectFormat(config.quality),
    "--paths",
    config.outputDirectory,
    "--output",
    "%(title).200B [%(id)s].%(ext)s",
  ];

  if (ffmpegPath) args.push("--ffmpeg-location", ffmpegPath);
  return [...args, config.url];
}

/**
 * Download directly through yt-dlp, avoiding media copies in the Node process.
 * @param {Readonly<DownloadConfig>} config
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function download(config, options = {}) {
  await mkdir(config.outputDirectory, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn(config.executable, buildYtdlpArgs(config), {
      stdio: "inherit",
      windowsHide: true,
    });
    let settled = false;

    const cleanup = () => options.signal?.removeEventListener("abort", abort);
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const abort = () => {
      child.kill("SIGTERM");
    };

    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();

    child.once("error", (cause) => {
      const notFound = /** @type {NodeJS.ErrnoException} */ (cause).code === "ENOENT";
      finish(() =>
        reject(
          new DownloadError(
            notFound ? `Executable not found: ${config.executable}` : "Could not start yt-dlp.",
            { code: notFound ? "NOT_FOUND" : "EXIT_FAILED", cause },
          ),
        ),
      );
    });

    child.once("close", (code, signal) => {
      finish(() => {
        if (options.signal?.aborted) {
          reject(new DownloadError("Download cancelled.", { code: "ABORTED" }));
        } else if (code === 0) {
          resolve();
        } else {
          reject(
            new DownloadError(`yt-dlp failed (${signal ?? `exit ${code ?? "unknown"}`}).`, {
              code: "EXIT_FAILED",
            }),
          );
        }
      });
    });
  });
}
