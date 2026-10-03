export class DownloadError extends Error {
  /**
   * @param {string} message
   * @param {{ code: string, cause?: unknown }} options
   */
  constructor(message, options) {
    super(message, { cause: options.cause });
    this.name = "DownloadError";
    this.code = options.code;
  }
}
