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
import { selectCompatibleFormat, selectConversionFormat } from "../core/formats.js";

/** @typedef {import('../core/config.js').DownloadConfig} DownloadConfig */

const DEFAULT_TERMINATION_GRACE_PERIOD = 3_000;
const CONVERSION_ARGUMENTS = [
  "-c:v",
  "libx264",
  "-crf",
  "18",
  "-preset",
  "medium",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
].join(" ");

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
 * @param {{ convert?: boolean, cookiesFromBrowser?: string }} [options]
 */
export function buildYtdlpArgs(config, options = {}) {
  const convert = options.convert ?? false;
  const argumentsList = [
    "--no-playlist",
    "--continue",
    "--no-overwrites",
    "--no-post-overwrites",
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
    "--format",
    convert ? selectConversionFormat(config.quality) : selectCompatibleFormat(config.quality),
    "--paths",
    config.outputDirectory,
    "--output",
    "%(title).200B [%(id)s].%(ext)s",
    "--quiet",
    "--no-warnings",
  ];

  if (convert) {
    argumentsList.push(
      "--merge-output-format",
      "mkv",
      "--remux-video",
      "mkv",
      "--recode-video",
      "mp4",
      "--postprocessor-args",
      `VideoConvertor+ffmpeg_o:${CONVERSION_ARGUMENTS}`,
    );
  }

  if (!convert) {
    argumentsList.push("--merge-output-format", "mp4", "--remux-video", "mp4");
  }

  if (ffmpegPath) {
    argumentsList.push("--ffmpeg-location", ffmpegPath);
  }

  if (options.cookiesFromBrowser) {
    argumentsList.push("--cookies-from-browser", options.cookiesFromBrowser);
  }

  return [...argumentsList, config.url];
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
function terminateProcessTree(child, signal) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    terminateWindowsProcessTree(child, false);
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    const errorCode = /** @type {NodeJS.ErrnoException} */ (error).code;

    if (errorCode !== "ESRCH") {
      child.kill(signal);
    }
  }
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {boolean} force
 */
function terminateWindowsProcessTree(child, force) {
  const argumentsList = ["/pid", String(child.pid), "/t"];

  if (force) {
    argumentsList.push("/f");
  }

  const termination = spawn("taskkill", argumentsList, {
    stdio: "ignore",
    windowsHide: true,
  });

  termination.once("error", () => child.kill(force ? "SIGKILL" : "SIGTERM"));
  termination.once("close", (code) => {
    if (code && child.exitCode === null) {
      child.kill(force ? "SIGKILL" : "SIGTERM");
    }
  });
}

/** @param {import('node:child_process').ChildProcess} child */
function forceTerminateProcessTree(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform !== "win32") {
    terminateProcessTree(child, "SIGKILL");
    return;
  }

  terminateWindowsProcessTree(child, true);
}

/**
 * @param {Readonly<DownloadConfig>} config
 * @param {{ convert: boolean, executable: string, cookiesFromBrowser?: string, signal?: AbortSignal, onEvent: (event: object) => void, onDiagnostic?: (message: string) => void, terminationGracePeriod: number }} options
 */
function runDownloadAttempt(config, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(options.executable, buildYtdlpArgs(config, options), {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const eventRouter = createEventRouter(options.onEvent);
    let diagnostics = "";
    let forceTerminationTimer;
    let settled = false;

    const onDiagnostic = (message) => {
      diagnostics = `${diagnostics}\n${message}`.slice(-32_768);
      options.onDiagnostic?.(message);
    };
    const abort = () => {
      terminateProcessTree(child, "SIGTERM");

      forceTerminationTimer = setTimeout(
        () => forceTerminateProcessTree(child),
        options.terminationGracePeriod,
      );
      forceTerminationTimer.unref();
    };
    const cleanup = () => {
      options.signal?.removeEventListener("abort", abort);

      if (forceTerminationTimer) {
        clearTimeout(forceTerminationTimer);
      }
    };
    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };

    observeEvents(child.stdout, eventRouter.route, onDiagnostic);
    observeEvents(child.stderr, eventRouter.route, onDiagnostic);
    options.signal?.addEventListener("abort", abort, { once: true });

    if (options.signal?.aborted) {
      abort();
    }

    child.once("error", (cause) => {
      finish(() => reject(createSpawnError(cause, options.executable)));
    });

    child.once("close", (code, signal) => {
      finish(() => {
        if (options.signal?.aborted) {
          reject(new DownloadError("Download cancelled.", { code: "ABORTED" }));
          return;
        }

        if (code === 0) {
          eventRouter.complete();
          resolve();
          return;
        }

        const failure = classifyDownloadFailure(diagnostics, code);

        reject(new DownloadError(failure.message, { code: failure.code, cause: signal }));
      });
    });
  });
}

/**
 * @param {Readonly<DownloadConfig>} config
 * @param {{ executable: string, cookiesFromBrowser?: string, signal?: AbortSignal, onEvent: (event: object) => void, onDiagnostic?: (message: string) => void, terminationGracePeriod: number }} options
 */
async function runWithCompatibilityFallback(config, options) {
  try {
    await runDownloadAttempt(config, { ...options, convert: false });
    return;
  } catch (error) {
    if (!(error instanceof DownloadError) || error.code !== "FORMAT_UNAVAILABLE") {
      throw error;
    }
  }

  options.onEvent({ type: "fallback" });
  await runDownloadAttempt(config, { ...options, convert: true });
}

/**
 * @param {Readonly<DownloadConfig>} config
 * @param {{ executable: string, cookiesFromBrowser?: string, signal?: AbortSignal, onEvent: (event: object) => void, onDiagnostic?: (message: string) => void, terminationGracePeriod: number }} options
 * @param {(() => Promise<string | undefined>) | undefined} onAuthenticationRequired
 */
async function runWithAuthenticationFallback(config, options, onAuthenticationRequired) {
  try {
    await runWithCompatibilityFallback(config, options);
    return;
  } catch (error) {
    if (!(error instanceof DownloadError) || error.code !== "AUTH_REQUIRED") {
      throw error;
    }

    if (!onAuthenticationRequired) {
      throw error;
    }

    const cookiesFromBrowser = await onAuthenticationRequired();

    if (!cookiesFromBrowser) {
      throw error;
    }

    await runWithCompatibilityFallback(config, { ...options, cookiesFromBrowser });
  }
}

/**
 * Download directly through yt-dlp, converting only when compatible streams are unavailable.
 * @param {Readonly<DownloadConfig>} config
 * @param {{ signal?: AbortSignal, onEvent?: (event: object) => void, onDiagnostic?: (message: string) => void, onAuthenticationRequired?: () => Promise<string | undefined>, executable?: string, terminationGracePeriod?: number }} [options]
 */
export async function download(config, options = {}) {
  const onEvent = options.onEvent ?? (() => {});
  const attemptOptions = {
    executable: options.executable ?? "yt-dlp",
    onDiagnostic: options.onDiagnostic,
    onEvent,
    signal: options.signal,
    terminationGracePeriod: options.terminationGracePeriod ?? DEFAULT_TERMINATION_GRACE_PERIOD,
  };

  await mkdir(config.outputDirectory, { recursive: true });

  try {
    await runWithAuthenticationFallback(config, attemptOptions, options.onAuthenticationRequired);
  } catch (error) {
    onEvent({ type: "failed" });
    throw error;
  }
}
