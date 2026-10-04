import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import ffmpegPath from "ffmpeg-static";
import { classifyDownloadFailure } from "../core/download-errors.js";
import {
  DOWNLOAD_COMPLETE_TEMPLATE,
  DOWNLOAD_PROCESSING_TEMPLATE,
  DOWNLOAD_PROGRESS_TEMPLATE,
  DOWNLOAD_START_TEMPLATE,
  parseDownloadEvent,
} from "../core/download-events.js";
import { DownloadError } from "../core/errors.js";
import { selectFormat } from "../core/formats.js";

/** @typedef {import('../core/config.js').DownloadConfig} DownloadConfig */

/**
 * @param {NodeJS.ReadableStream} stream
 * @param {(event: object) => void} onEvent
 * @param {(message: string) => void} onDiagnostic
 */
function observeEvents(stream, onEvent, onDiagnostic) {
  const lines = createInterface({ input: stream });

  lines.on("line", (line) => {
    const event = parseDownloadEvent(line);

    if (!event) {
      onDiagnostic(line);
      return;
    }

    onEvent(event);
  });
}

/** @param {(event: object) => void} onEvent */
function createEventRouter(onEvent) {
  let started = false;
  let completionEvent;
  let pendingEvents = [];

  const route = (event) => {
    if (event.type === "complete") {
      completionEvent = event;
      return;
    }

    if (event.type === "start") {
      started = true;
      onEvent(event);
      pendingEvents.forEach(onEvent);
      pendingEvents = [];
      return;
    }

    if (!started) {
      pendingEvents.push(event);
      return;
    }

    onEvent(event);
  };

  const complete = () => {
    pendingEvents.forEach(onEvent);

    if (completionEvent) {
      onEvent(completionEvent);
    }
  };

  return Object.freeze({ route, complete });
}

/**
 * @param {string[]} args
 * @param {boolean} verbose
 */
function addLoggingArgs(args, verbose) {
  if (verbose) {
    args.push("--verbose");
    return;
  }

  args.push("--quiet", "--no-warnings");
}

/** @param {unknown} cause */
function createSpawnError(cause, executable) {
  const errorCode = /** @type {NodeJS.ErrnoException} */ (cause).code;

  if (errorCode === "ENOENT") {
    return new DownloadError(`Executável não encontrado: ${executable}`, {
      code: "NOT_FOUND",
      cause,
    });
  }

  return new DownloadError("Não foi possível iniciar o yt-dlp.", {
    code: "EXIT_FAILED",
    cause,
  });
}

/**
 * Build arguments separately so command construction stays testable.
 * @param {Readonly<DownloadConfig>} config
 */
export function buildYtdlpArgs(config) {
  const args = [
    "--no-playlist",
    "--continue",
    "--no-overwrites",
    "--progress",
    "--newline",
    "--progress-delta",
    "0.2",
    "--progress-template",
    `download:${DOWNLOAD_PROGRESS_TEMPLATE}`,
    "--progress-template",
    `postprocess:${DOWNLOAD_PROCESSING_TEMPLATE}`,
    "--print",
    `before_dl:${DOWNLOAD_START_TEMPLATE}`,
    "--print",
    `after_move:${DOWNLOAD_COMPLETE_TEMPLATE}`,
    "--concurrent-fragments",
    String(config.connections),
    "--format",
    selectFormat(config.quality),
    "--merge-output-format",
    "mp4",
    "--remux-video",
    "mp4",
    "--paths",
    config.outputDirectory,
    "--output",
    "%(title).200B [%(id)s].%(ext)s",
  ];

  addLoggingArgs(args, config.verbose);

  if (ffmpegPath) {
    args.push("--ffmpeg-location", ffmpegPath);
  }

  if (config.cookiesFromBrowser) {
    args.push("--cookies-from-browser", config.cookiesFromBrowser);
  }

  if (config.cookiesFile) {
    args.push("--cookies", config.cookiesFile);
  }

  return [...args, config.url];
}

/**
 * Download directly through yt-dlp, avoiding media copies in the Node process.
 * @param {Readonly<DownloadConfig>} config
 * @param {{ signal?: AbortSignal, onEvent?: (event: object) => void, onDiagnostic?: (message: string) => void }} [options]
 */
export async function download(config, options = {}) {
  await mkdir(config.outputDirectory, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn(config.executable, buildYtdlpArgs(config), {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let settled = false;
    let diagnostics = "";

    const onEvent = options.onEvent ?? (() => {});
    const eventRouter = createEventRouter(onEvent);
    const onDiagnostic = (message) => {
      diagnostics = `${diagnostics}\n${message}`.slice(-32_768);
      options.onDiagnostic?.(message);
    };

    observeEvents(child.stdout, eventRouter.route, onDiagnostic);
    observeEvents(child.stderr, eventRouter.route, onDiagnostic);

    const cleanup = () => options.signal?.removeEventListener("abort", abort);
    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };
    const abort = () => {
      child.kill("SIGTERM");
    };

    options.signal?.addEventListener("abort", abort, { once: true });

    if (options.signal?.aborted) {
      abort();
    }

    child.once("error", (cause) => {
      finish(() => {
        onEvent({ type: "failed" });
        reject(createSpawnError(cause, config.executable));
      });
    });

    child.once("close", (code, signal) => {
      finish(() => {
        if (options.signal?.aborted) {
          onEvent({ type: "failed" });
          reject(new DownloadError("Download cancelled.", { code: "ABORTED" }));
          return;
        }

        if (code === 0) {
          eventRouter.complete();
          resolve();
          return;
        }

        const failure = classifyDownloadFailure(diagnostics, code);

        onEvent({ type: "failed" });
        reject(new DownloadError(failure.message, { code: failure.code, cause: signal }));
      });
    });
  });
}
