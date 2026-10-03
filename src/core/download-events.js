const PROGRESS_PREFIX = "YTDOWN_PROGRESS";
const EVENT_PREFIX = "YTDOWN_EVENT";

export const DOWNLOAD_PROGRESS_TEMPLATE = [
  PROGRESS_PREFIX,
  "%(progress.downloaded_bytes)s",
  "%(progress.total_bytes,progress.total_bytes_estimate)s",
  "%(progress.speed)s",
  "%(progress.eta)s",
].join("\t");

export const DOWNLOAD_START_TEMPLATE = `${EVENT_PREFIX}\tstart\t%(title)s`;
export const DOWNLOAD_PROCESSING_TEMPLATE = `${EVENT_PREFIX}\tprocessing`;
export const DOWNLOAD_COMPLETE_TEMPLATE = `${EVENT_PREFIX}\tcomplete\t%(filepath)s`;

/** @param {string | undefined} value */
function parseNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

/** @param {string[]} fields */
function parseProgress(fields) {
  return Object.freeze({
    type: "progress",
    downloadedBytes: parseNumber(fields[1]),
    totalBytes: parseNumber(fields[2]),
    speedBytesPerSecond: parseNumber(fields[3]),
    etaSeconds: parseNumber(fields[4]),
  });
}

/** @param {string[]} fields */
function parseEvent(fields) {
  const name = fields[1];

  if (name === "start") {
    return Object.freeze({ type: "start", title: fields.slice(2).join("\t") });
  }

  if (name === "processing") {
    return Object.freeze({ type: "processing" });
  }

  if (name === "complete") {
    return Object.freeze({ type: "complete", path: fields.slice(2).join("\t") });
  }

  return undefined;
}

/**
 * Parse one private protocol line emitted by yt-dlp.
 * @param {string} line
 */
export function parseDownloadEvent(line) {
  const fields = line.trim().split("\t");
  const prefix = fields[0];

  if (prefix === PROGRESS_PREFIX) {
    return parseProgress(fields);
  }

  if (prefix === EVENT_PREFIX) {
    return parseEvent(fields);
  }

  return undefined;
}
