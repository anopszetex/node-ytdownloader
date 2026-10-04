import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConfig } from "../src/core/config.js";

const input = {
  url: "https://example.com/watch?v=1",
  outputDirectory: "downloads",
  quality: "best",
  connections: "8",
  compatibility: "original",
  executable: "yt-dlp",
  cookiesFromBrowser: undefined,
  cookiesFile: undefined,
  verbose: false,
};

describe("createConfig", () => {
  it("normalizes and freezes valid input", () => {
    const config = createConfig(input, "/project");

    assert.equal(config.url, "https://example.com/watch?v=1");
    assert.equal(config.outputDirectory, "/project/downloads");
    assert.equal(config.connections, 8);
    assert.ok(Object.isFrozen(config));
  });

  it("accepts any HTTP website", () => {
    assert.equal(createConfig(input).url, "https://example.com/watch?v=1");
  });

  it("rejects unsafe protocols", () => {
    assert.throws(() => createConfig({ ...input, url: "file:///etc/passwd" }), /HTTP/);
  });

  it("rejects invalid quality and concurrency", () => {
    assert.throws(() => createConfig({ ...input, quality: "4k" }), /qualidade/);
    assert.throws(() => createConfig({ ...input, connections: "0" }), /conexões/);
    assert.throws(() => createConfig({ ...input, connections: "2.5" }), /conexões/);
  });

  it("accepts only one cookies source", () => {
    assert.throws(
      () =>
        createConfig({
          ...input,
          cookiesFromBrowser: "chrome",
          cookiesFile: "cookies.txt",
        }),
      /não ambos/,
    );
  });

  it("validates compatibility mode", () => {
    assert.equal(createConfig({ ...input, compatibility: "universal" }).compatibility, "universal");
    assert.throws(() => createConfig({ ...input, compatibility: "quicktime" }), /compatibilidade/);
  });
});
