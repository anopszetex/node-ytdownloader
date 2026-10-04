import path from "node:path";
import {
  validateCompatibility,
  validateConnections,
  validateQuality,
  validateUrl,
} from "./validators.js";

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
    validateRequired(input.cookiesFromBrowser, "O nome do navegador não pode estar vazio.");
  }

  if (input.cookiesFile !== undefined) {
    validateRequired(input.cookiesFile, "O arquivo de cookies não pode estar vazio.");
  }

  if (input.cookiesFromBrowser && input.cookiesFile) {
    throw new TypeError("Use cookies do navegador ou um arquivo de cookies, não ambos.");
  }
}

/**
 * @typedef {object} DownloadConfigInput
 * @property {string} url
 * @property {string} outputDirectory
 * @property {string} quality
 * @property {string} connections
 * @property {string} compatibility
 * @property {string} executable
 * @property {string | undefined} cookiesFromBrowser
 * @property {string | undefined} cookiesFile
 * @property {boolean} verbose
 */

/**
 * @typedef {object} DownloadConfig
 * @property {string} url
 * @property {string} outputDirectory
 * @property {'best' | 720 | 1080 | 1440 | 2160} quality
 * @property {number} connections
 * @property {'original' | 'universal'} compatibility
 * @property {string} executable
 * @property {string | undefined} cookiesFromBrowser
 * @property {string | undefined} cookiesFile
 * @property {boolean} verbose
 */

/**
 * Validate and normalize user configuration.
 * @param {DownloadConfigInput} input
 * @param {string} [cwd]
 * @returns {Readonly<DownloadConfig>}
 */
export function createConfig(input, cwd = process.cwd()) {
  validateRequired(input.outputDirectory, "A pasta de destino não pode estar vazia.");
  validateRequired(input.executable, "O executável do yt-dlp não pode estar vazio.");
  validateCookies(input);

  return Object.freeze({
    url: validateUrl(input.url),
    outputDirectory: path.resolve(cwd, input.outputDirectory),
    quality: validateQuality(input.quality),
    connections: validateConnections(input.connections),
    compatibility: validateCompatibility(input.compatibility),
    executable: input.executable,
    cookiesFromBrowser: input.cookiesFromBrowser,
    cookiesFile: input.cookiesFile ? path.resolve(cwd, input.cookiesFile) : undefined,
    verbose: input.verbose,
  });
}
