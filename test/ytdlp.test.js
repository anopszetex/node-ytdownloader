import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectFormat } from "../src/core/formats.js";
import { buildYtdlpArgs } from "../src/infra/ytdlp.js";

describe("yt-dlp command", () => {
  it("prefers M4A audio without transcoding", () => {
    assert.equal(
      selectFormat("best", "original"),
      "bestvideo*+bestaudio[ext=m4a]/bestvideo*+bestaudio/best",
    );
    assert.equal(
      selectFormat(1080, "original"),
      "bestvideo*[height<=1080]+bestaudio[ext=m4a]/" +
        "bestvideo*[height<=1080]+bestaudio/best[height<=1080]",
    );
  });

  it("prioritizes H.264 up to 1080p in universal mode", () => {
    assert.match(selectFormat(1080, "universal"), /vcodec\^=avc1/);
    assert.doesNotMatch(selectFormat(1440, "universal"), /vcodec\^=avc1/);
    assert.match(selectFormat("best", "universal"), /height>1080/);
    assert.match(selectFormat("best", "universal"), /vcodec\^=avc1/);
  });

  it("writes directly to the requested directory", () => {
    const args = buildYtdlpArgs({
      url: "https://example.com/video",
      outputDirectory: "/tmp/downloads",
      quality: "best",
      connections: 8,
      compatibility: "original",
      executable: "yt-dlp",
      cookiesFromBrowser: undefined,
      cookiesFile: undefined,
      verbose: false,
    });

    assert.ok(args.includes("--paths"));
    assert.ok(args.includes("/tmp/downloads"));
    assert.ok(args.includes("--concurrent-fragments"));
    assert.ok(args.includes("--progress-template"));
    assert.ok(args.includes("--progress-delta"));
    assert.ok(args.includes("--quiet"));
    assert.equal(args.at(-1), "https://example.com/video");
    assert.equal(args.includes("--exec"), false);
    assert.equal(args.includes("--newline"), true);
  });

  it("generates an MP4 container without transcoding", () => {
    const args = buildYtdlpArgs({
      url: "https://example.com/video",
      outputDirectory: "/tmp/downloads",
      quality: "best",
      connections: 8,
      compatibility: "original",
      executable: "yt-dlp",
      cookiesFromBrowser: undefined,
      cookiesFile: undefined,
      verbose: false,
    });
    const mergeFormatIndex = args.indexOf("--merge-output-format");
    const remuxFormatIndex = args.indexOf("--remux-video");

    assert.equal(args[mergeFormatIndex + 1], "mp4");
    assert.equal(args[remuxFormatIndex + 1], "mp4");
    assert.equal(args.includes("--recode-video"), false);
  });

  it("passes browser cookies without exposing their contents", () => {
    const args = buildYtdlpArgs({
      url: "https://example.com/video",
      outputDirectory: "/tmp/downloads",
      quality: "best",
      connections: 8,
      compatibility: "original",
      executable: "yt-dlp",
      cookiesFromBrowser: "firefox",
      cookiesFile: undefined,
      verbose: false,
    });

    assert.deepEqual(args.slice(-3), [
      "--cookies-from-browser",
      "firefox",
      "https://example.com/video",
    ]);
  });
});
