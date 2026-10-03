const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB"];
const DEFAULT_COLUMNS = 80;
const MINIMUM_BAR_WIDTH = 10;
const MAXIMUM_BAR_WIDTH = 30;

/** @param {number | undefined} bytes */
export function formatBytes(bytes) {
  if (bytes === undefined || bytes < 0) {
    return "—";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const precision = unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${BYTE_UNITS[unitIndex]}`;
}

/** @param {number | undefined} seconds */
export function formatDuration(seconds) {
  if (seconds === undefined || seconds < 0) {
    return "—";
  }

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * @param {number | undefined} downloadedBytes
 * @param {number | undefined} totalBytes
 */
export function calculatePercentage(downloadedBytes, totalBytes) {
  if (downloadedBytes === undefined || totalBytes === undefined || totalBytes <= 0) {
    return undefined;
  }

  return Math.min(100, Math.max(0, (downloadedBytes / totalBytes) * 100));
}

/**
 * @param {number} percentage
 * @param {number} width
 */
export function createBar(percentage, width) {
  const completedWidth = Math.round((percentage / 100) * width);
  const pendingWidth = width - completedWidth;

  return `${"█".repeat(completedWidth)}${"░".repeat(pendingWidth)}`;
}

/** @param {number | undefined} columns */
function calculateBarWidth(columns) {
  const terminalColumns = columns ?? DEFAULT_COLUMNS;
  const availableWidth = terminalColumns - 50;

  return Math.min(MAXIMUM_BAR_WIDTH, Math.max(MINIMUM_BAR_WIDTH, availableWidth));
}

/**
 * @param {{ downloadedBytes?: number, totalBytes?: number, speedBytesPerSecond?: number, etaSeconds?: number }} event
 * @param {number} [columns]
 */
export function formatProgress(event, columns) {
  const percentage = calculatePercentage(event.downloadedBytes, event.totalBytes);
  const speed = formatBytes(event.speedBytesPerSecond);
  const eta = formatDuration(event.etaSeconds);

  if (percentage === undefined) {
    return `Baixando ${formatBytes(event.downloadedBytes)} • ${speed}/s • ETA ${eta}`;
  }

  const roundedPercentage = Math.round(percentage);
  const bar = createBar(percentage, calculateBarWidth(columns));

  return `Baixando [${bar}] ${roundedPercentage}% • ${speed}/s • ETA ${eta}`;
}

/**
 * @param {{ output?: NodeJS.WriteStream, interactive?: boolean }} [options]
 */
export function createProgressReporter(options = {}) {
  const output = options.output ?? process.stdout;
  const interactive = options.interactive ?? Boolean(output.isTTY);
  let progressVisible = false;
  let lastProgressBucket = -1;

  const clearProgress = () => {
    if (!progressVisible) {
      return;
    }

    output.write("\r\u001B[2K");
    progressVisible = false;
  };

  const writeLine = (message) => {
    clearProgress();
    output.write(`${message}\n`);
  };

  const renderStart = (event) => {
    writeLine("Preparando download…");
    writeLine(`Vídeo: ${event.title}`);
    output.write("\n");
  };

  const renderInteractiveProgress = (event) => {
    const line = formatProgress(event, output.columns);

    output.write(`\r\u001B[2K${line}`);
    progressVisible = true;
  };

  const renderPlainProgress = (event) => {
    const percentage = calculatePercentage(event.downloadedBytes, event.totalBytes);

    if (percentage === undefined && lastProgressBucket >= 0) {
      return;
    }

    const progressBucket = percentage === undefined ? 0 : Math.floor(percentage / 10);

    if (progressBucket === lastProgressBucket) {
      return;
    }

    lastProgressBucket = progressBucket;
    writeLine(formatProgress(event, output.columns));
  };

  const renderProgress = (event) => {
    if (interactive) {
      renderInteractiveProgress(event);
      return;
    }

    renderPlainProgress(event);
  };

  const renderProcessing = () => {
    clearProgress();
    writeLine("Processando mídia…");
  };

  const renderComplete = (event) => {
    clearProgress();
    writeLine("✓ Download concluído");
    writeLine(`  Arquivo: ${event.path}`);
  };

  const renderers = Object.freeze({
    start: renderStart,
    progress: renderProgress,
    processing: renderProcessing,
    complete: renderComplete,
  });

  return (event) => {
    const render = renderers[event.type];

    if (!render) {
      return;
    }

    render(event);
  };
}
