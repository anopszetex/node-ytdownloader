import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCliArgs } from "../src/cli/args.js";

describe("parseCliArgs", () => {
  it("uses fast download defaults", () => {
    const command = parseCliArgs(["https://example.com/video"]);

    assert.deepEqual(command, {
      kind: "download",
      input: {
        url: "https://example.com/video",
        outputDirectory: "downloads",
        quality: "best",
        connections: "8",
        executable: "yt-dlp",
        cookiesFromBrowser: undefined,
        cookiesFile: undefined,
        verbose: false,
      },
    });
  });

  it("parses download options", () => {
    const command = parseCliArgs([
      "-o",
      "media",
      "-q",
      "1080",
      "-N",
      "16",
      "--ytdlp",
      "/usr/local/bin/yt-dlp",
      "--cookies-from-browser",
      "chrome:Default",
      "https://example.com/video",
    ]);

    assert.equal(command.kind, "download");
    assert.deepEqual(command.input, {
      url: "https://example.com/video",
      outputDirectory: "media",
      quality: "1080",
      connections: "16",
      executable: "/usr/local/bin/yt-dlp",
      cookiesFromBrowser: "chrome:Default",
      cookiesFile: undefined,
      verbose: false,
    });
  });

  it("requires one URL", () => {
    assert.throws(() => parseCliArgs([]), /exatamente uma/);
    assert.throws(
      () => parseCliArgs(["https://example.com/one", "https://example.com/two"]),
      /exatamente uma/,
    );
  });
});
