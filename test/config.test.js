import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConfig } from "../src/core/config.js";

const input = {
  url: "https://example.com/watch?v=1",
  quality: 1080,
};

describe("createConfig", () => {
  it("normalizes and freezes valid input", () => {
    const config = createConfig(input, "/project");

    assert.deepEqual(config, {
      url: "https://example.com/watch?v=1",
      outputDirectory: "/project/downloads",
      quality: 1080,
    });
    assert.ok(Object.isFrozen(config));
  });

  it("accepts any HTTP website", () => {
    assert.equal(createConfig(input).url, "https://example.com/watch?v=1");
  });

  it("rejects unsafe protocols", () => {
    assert.throws(() => createConfig({ ...input, url: "file:///etc/passwd" }), /HTTP/);
  });

  it("accepts only 720p and 1080p", () => {
    assert.equal(createConfig({ ...input, quality: 720 }).quality, 720);
    assert.throws(() => createConfig({ ...input, quality: 2160 }), /720 ou 1080/);
  });
});
