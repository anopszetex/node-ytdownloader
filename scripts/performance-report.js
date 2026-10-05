import { performance } from "node:perf_hooks";

const GRAPH_CHARACTERS = [..."▁▂▃▄▅▆▇█"];
const DEFAULT_COLUMNS = 80;
const MINIMUM_GRAPH_WIDTH = 8;
const MAXIMUM_GRAPH_WIDTH = 32;
const SAMPLE_INTERVAL_MILLISECONDS = 250;

/**
 * @typedef {object} ResourceSample
 * @property {number} elapsedMilliseconds
 * @property {number} cpuPercentage
 * @property {number} rssBytes
 */

/**
 * @param {{ user: number, system: number }} previousUsage
 * @param {{ user: number, system: number }} currentUsage
 * @param {number} elapsedMilliseconds
 */
export function calculateCpuPercentage(previousUsage, currentUsage, elapsedMilliseconds) {
  if (elapsedMilliseconds <= 0) {
    return 0;
  }

  const userMicroseconds = Math.max(0, currentUsage.user - previousUsage.user);
  const systemMicroseconds = Math.max(0, currentUsage.system - previousUsage.system);
  const elapsedMicroseconds = elapsedMilliseconds * 1_000;

  return ((userMicroseconds + systemMicroseconds) / elapsedMicroseconds) * 100;
}

/**
 * @param {number[]} values
 * @param {number} maximumPoints
 */
function reduceValues(values, maximumPoints) {
  if (values.length <= maximumPoints) {
    return values;
  }

  const bucketSize = values.length / maximumPoints;

  return Array.from({ length: maximumPoints }, (_, index) => {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const bucket = values.slice(start, end);
    const total = bucket.reduce((sum, value) => sum + value, 0);

    return total / bucket.length;
  });
}

/**
 * @param {number[]} values
 * @param {number} width
 */
export function createSparkline(values, width) {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0 || width <= 0) {
    return "—";
  }

  const points = reduceValues(finiteValues, width);
  const minimum = Math.min(...points);
  const maximum = Math.max(...points);

  if (minimum === maximum) {
    return GRAPH_CHARACTERS[3].repeat(points.length);
  }

  return points
    .map((value) => {
      const ratio = (value - minimum) / (maximum - minimum);
      const characterIndex = Math.round(ratio * (GRAPH_CHARACTERS.length - 1));

      return GRAPH_CHARACTERS[characterIndex];
    })
    .join("");
}

/** @param {number[]} values */
function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** @param {number} bytes */
function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

/** @param {number} milliseconds */
function formatDuration(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const shortDuration = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (hours === 0) {
    return shortDuration;
  }

  return `${String(hours).padStart(2, "0")}:${shortDuration}`;
}

/** @param {number | undefined} columns */
function calculateGraphWidth(columns) {
  const availableWidth = (columns ?? DEFAULT_COLUMNS) - 16;

  return Math.min(MAXIMUM_GRAPH_WIDTH, Math.max(MINIMUM_GRAPH_WIDTH, availableWidth));
}

/** @param {number} exitCode */
function formatStatus(exitCode) {
  if (exitCode === 0) {
    return "concluída";
  }

  if (exitCode === 130) {
    return "cancelada";
  }

  return `falhou (código ${exitCode})`;
}

/**
 * @param {{ durationMilliseconds: number, samples: ReadonlyArray<ResourceSample> }} measurement
 * @param {{ columns?: number, exitCode?: number }} [options]
 */
export function formatPerformanceReport(measurement, options = {}) {
  const width = calculateGraphWidth(options.columns);
  const cpuValues = measurement.samples.map((sample) => sample.cpuPercentage);
  const memoryValues = measurement.samples.map((sample) => sample.rssBytes);
  const averageCpu = average(cpuValues);
  const peakCpu = Math.max(0, ...cpuValues);
  const averageMemory = average(memoryValues);
  const peakMemory = Math.max(0, ...memoryValues);
  const exitCode = options.exitCode ?? 0;

  return [
    "Performance — processo Node",
    `CPU      ${createSparkline(cpuValues, width)}`,
    `         média ${averageCpu.toFixed(1)}% • pico ${peakCpu.toFixed(1)}%`,
    `Memória  ${createSparkline(memoryValues, width)}`,
    `         média ${formatBytes(averageMemory)} • pico ${formatBytes(peakMemory)}`,
    `Duração  ${formatDuration(measurement.durationMilliseconds)}`,
    `Status   ${formatStatus(exitCode)}`,
  ].join("\n");
}

/**
 * @param {{ now?: () => number, readCpuUsage?: () => NodeJS.CpuUsage, readMemoryUsage?: () => NodeJS.MemoryUsage, schedule?: typeof setInterval, cancelSchedule?: typeof clearInterval, sampleIntervalMilliseconds?: number }} [options]
 */
export function createPerformanceMonitor(options = {}) {
  const now = options.now ?? (() => performance.now());
  const readCpuUsage = options.readCpuUsage ?? (() => process.cpuUsage());
  const readMemoryUsage = options.readMemoryUsage ?? (() => process.memoryUsage());
  const schedule = options.schedule ?? setInterval;
  const cancelSchedule = options.cancelSchedule ?? clearInterval;
  const sampleInterval = options.sampleIntervalMilliseconds ?? SAMPLE_INTERVAL_MILLISECONDS;
  /** @type {ResourceSample[]} */
  let samples = [];
  let startedAt = 0;
  let previousSampleAt = 0;
  let previousCpuUsage = { user: 0, system: 0 };
  let timer;
  let running = false;

  const takeSample = () => {
    const sampledAt = now();
    const cpuUsage = readCpuUsage();
    const memoryUsage = readMemoryUsage();
    const cpuPercentage = calculateCpuPercentage(
      previousCpuUsage,
      cpuUsage,
      sampledAt - previousSampleAt,
    );

    samples.push({
      cpuPercentage,
      elapsedMilliseconds: sampledAt - startedAt,
      rssBytes: memoryUsage.rss,
    });
    previousSampleAt = sampledAt;
    previousCpuUsage = cpuUsage;
  };

  const start = () => {
    if (running) {
      return;
    }

    startedAt = now();
    previousSampleAt = startedAt;
    previousCpuUsage = readCpuUsage();
    samples = [];
    running = true;
    takeSample();
    timer = schedule(takeSample, sampleInterval);
    timer.unref?.();
  };

  const stop = () => {
    if (!running) {
      return Object.freeze({ durationMilliseconds: 0, samples: Object.freeze([]) });
    }

    cancelSchedule(timer);
    takeSample();
    running = false;

    const durationMilliseconds = samples.at(-1)?.elapsedMilliseconds ?? 0;
    const immutableSamples = samples.map((sample) => Object.freeze({ ...sample }));

    return Object.freeze({
      durationMilliseconds,
      samples: Object.freeze(immutableSamples),
    });
  };

  return Object.freeze({ start, stop });
}
