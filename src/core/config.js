import path from "node:path";
import { validateConnections, validateQuality, validateUrl } from "./validators.js";

/**
 * @param {string} value
 * @param {string} message
 */
function validateRequired(value, message) {
  if (!value.trim()) {
    throw new TypeError(message);
  }
}

/** @param {DownloadConfigInput} input */
function validateCookies(input) {
  if (input.cookiesFromBrowser !== undefined) {
    validateRequired(input.cookiesFromBrowser, "Browser name cannot be empty.");
  }

  if (input.cookiesFile !== undefined) {
    validateRequired(input.cookiesFile, "Cookies file cannot be empty.");
  }

  if (input.cookiesFromBrowser && input.cookiesFile) {
    throw new TypeError("Use either browser cookies or a cookies file, not both.");
  }
}

/**
 * @typedef {object} DownloadConfigInput
 * @property {string} url
 * @property {string} outputDirectory
 * @property {string} quality
 * @property {string} connections
 * @property {string} executable
 * @property {string | undefined} cookiesFromBrowser
 * @property {string | undefined} cookiesFile
 */

/**
 * @typedef {object} DownloadConfig
 * @property {string} url
 * @property {string} outputDirectory
 * @property {'best' | 720 | 1080 | 1440 | 2160} quality
 * @property {number} connections
 * @property {string} executable
 * @property {string | undefined} cookiesFromBrowser
 * @property {string | undefined} cookiesFile
 */

/**
 * Validate and normalize user configuration.
 * @param {DownloadConfigInput} input
 * @param {string} [cwd]
 * @returns {Readonly<DownloadConfig>}
 */
export function createConfig(input, cwd = process.cwd()) {
  validateRequired(input.outputDirectory, "Output directory cannot be empty.");
  validateRequired(input.executable, "yt-dlp executable cannot be empty.");
  validateCookies(input);

  return Object.freeze({
    url: validateUrl(input.url),
    outputDirectory: path.resolve(cwd, input.outputDirectory),
    quality: validateQuality(input.quality),
    connections: validateConnections(input.connections),
    executable: input.executable,
    cookiesFromBrowser: input.cookiesFromBrowser,
    cookiesFile: input.cookiesFile ? path.resolve(cwd, input.cookiesFile) : undefined,
  });
}
