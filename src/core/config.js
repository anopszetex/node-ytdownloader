import path from "node:path";
import { validateConnections, validateQuality, validateUrl } from "./validators.js";

/**
 * @typedef {object} DownloadConfigInput
 * @property {string} url
 * @property {string} outputDirectory
 * @property {string} quality
 * @property {string} connections
 * @property {string} executable
 */

/**
 * @typedef {object} DownloadConfig
 * @property {string} url
 * @property {string} outputDirectory
 * @property {'best' | 720 | 1080 | 1440 | 2160} quality
 * @property {number} connections
 * @property {string} executable
 */

/**
 * Validate and normalize user configuration.
 * @param {DownloadConfigInput} input
 * @param {string} [cwd]
 * @returns {Readonly<DownloadConfig>}
 */
export function createConfig(input, cwd = process.cwd()) {
  if (!input.outputDirectory.trim()) {
    throw new TypeError("Output directory cannot be empty.");
  }
  if (!input.executable.trim()) {
    throw new TypeError("yt-dlp executable cannot be empty.");
  }

  return Object.freeze({
    url: validateUrl(input.url),
    outputDirectory: path.resolve(cwd, input.outputDirectory),
    quality: validateQuality(input.quality),
    connections: validateConnections(input.connections),
    executable: input.executable,
  });
}
