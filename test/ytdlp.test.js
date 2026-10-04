import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectCompatibleFormat, selectConversionFormat } from "../src/core/formats.js";
import { buildYtdlpArgs } from "../src/infra/ytdlp.js";

const config = {
  url: "https://example.com/video",
  outputDirectory: "/tmp/downloads",
  quality: 1080,
};

describe("yt-dlp command", () => {
  it("selects H.264 and AAC without transcoding first", () => {
    const format = selectCompatibleFormat(1080);
    const argumentsList = buildYtdlpArgs(config);

    assert.match(format, /avc1\|h264/);
    assert.match(format, /mp4a\|aac/);
    assert.equal(argumentsList.includes("--recode-video"), false);
    assert.equal(argumentsList[argumentsList.indexOf("--merge-output-format") + 1], "mp4");
  });

  it("builds a bounded conversion fallback", () => {
    const format = selectConversionFormat(720);
    const argumentsList = buildYtdlpArgs({ ...config, quality: 720 }, { convert: true });
    const postprocessorArguments = argumentsList[argumentsList.indexOf("--postprocessor-args") + 1];

    assert.match(format, /height<=720/);
    assert.equal(argumentsList[argumentsList.indexOf("--recode-video") + 1], "mp4");
    assert.equal(argumentsList[argumentsList.indexOf("--remux-video") + 1], "mkv");
    assert.match(postprocessorArguments, /libx264/);
    assert.match(postprocessorArguments, /-c:a aac/);
  });

  it("writes directly without overwriting download or post-process output", () => {
    const argumentsList = buildYtdlpArgs(config);

    assert.ok(argumentsList.includes("--paths"));
    assert.ok(argumentsList.includes("/tmp/downloads"));
    assert.ok(argumentsList.includes("--no-overwrites"));
    assert.ok(argumentsList.includes("--no-post-overwrites"));
    assert.equal(argumentsList.at(-1), "https://example.com/video");
    assert.equal(argumentsList.includes("--exec"), false);
  });
});
