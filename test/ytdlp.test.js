import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectFormat } from "../src/core/formats.js";
import { buildYtdlpArgs } from "../src/infra/ytdlp.js";

describe("yt-dlp command", () => {
  it("selects the best source quality without transcoding", () => {
    assert.equal(selectFormat("best"), "bestvideo*+bestaudio/best");
    assert.equal(selectFormat(1080), "bestvideo*[height<=1080]+bestaudio/best[height<=1080]");
  });

  it("writes directly to the requested directory", () => {
    const args = buildYtdlpArgs({
      url: "https://example.com/video",
      outputDirectory: "/tmp/downloads",
      quality: "best",
      connections: 8,
      executable: "yt-dlp",
    });

    assert.ok(args.includes("--paths"));
    assert.ok(args.includes("/tmp/downloads"));
    assert.ok(args.includes("--concurrent-fragments"));
    assert.equal(args.at(-1), "https://example.com/video");
    assert.equal(args.includes("--exec"), false);
  });
});
