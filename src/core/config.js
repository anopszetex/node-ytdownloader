import path from "node:path";
import { validateQuality, validateUrl } from "./validators.js";

/**
 * @typedef {object} DownloadConfigInput
 * @property {string} url
 * @property {720 | 1080} quality
 */

/**
 * @typedef {object} DownloadConfig
 * @property {string} url
 * @property {string} outputDirectory
 * @property {720 | 1080} quality
 */

/**
 * Validate and normalize user configuration.
 * @param {DownloadConfigInput} input
 * @param {string} [cwd]
 * @returns {Readonly<DownloadConfig>}
 */
export function createConfig(input, cwd = process.cwd()) {
  return Object.freeze({
    url: validateUrl(input.url),
    outputDirectory: path.resolve(cwd, "downloads"),
    quality: validateQuality(input.quality),
  });
}
