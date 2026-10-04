import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyDownloadFailure } from "../src/core/download-errors.js";

describe("classifyDownloadFailure", () => {
  it("prioritizes rate limiting", () => {
    const failure = classifyDownloadFailure(
      "HTTP Error 429: Too Many Requests\nSign in to confirm you’re not a bot",
      1,
    );

    assert.equal(failure.code, "RATE_LIMIT");
    assert.match(failure.message, /limitou temporariamente/);
  });

  it("translates authentication and availability errors", () => {
    assert.equal(classifyDownloadFailure("Sign in to confirm", 1).code, "AUTH_REQUIRED");
    assert.equal(classifyDownloadFailure("Unsupported URL", 1).code, "UNSUPPORTED");
    assert.equal(classifyDownloadFailure("Video unavailable", 1).code, "UNAVAILABLE");
  });

  it("returns an actionable fallback", () => {
    const failure = classifyDownloadFailure("unknown failure", 7);

    assert.equal(failure.code, "EXIT_FAILED");
    assert.match(failure.message, /código 7/);
    assert.match(failure.message, /Atualize o yt-dlp/);
  });
});
