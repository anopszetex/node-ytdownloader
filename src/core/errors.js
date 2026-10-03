export class DownloadError extends Error {
  /**
   * @param {string} message
   * @param {{ code: 'ABORTED' | 'NOT_FOUND' | 'EXIT_FAILED', cause?: unknown }} options
   */
  constructor(message, options) {
    super(message, { cause: options.cause });
    this.name = "DownloadError";
    this.code = options.code;
  }
}
