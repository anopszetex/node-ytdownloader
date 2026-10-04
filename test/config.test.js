import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConfig } from "../src/core/config.js";

const input = {
  url: "https://example.com/watch?v=1",
  quality: 1080,
};

describe("configuração de download", () => {
  it("normaliza e congela uma entrada válida", () => {
    const config = createConfig(input, "/project");

    assert.deepEqual(config, {
      url: "https://example.com/watch?v=1",
      outputDirectory: "/project/downloads",
      quality: 1080,
    });
    assert.ok(Object.isFrozen(config));
  });

  it("aceita qualquer site HTTP", () => {
    assert.equal(createConfig(input).url, "https://example.com/watch?v=1");
  });

  it("rejeita protocolos inseguros", () => {
    assert.throws(() => createConfig({ ...input, url: "file:///etc/passwd" }), /HTTP/);
  });

  it("aceita somente 720p e 1080p", () => {
    assert.equal(createConfig({ ...input, quality: 720 }).quality, 720);
    assert.throws(() => createConfig({ ...input, quality: 2160 }), /720 ou 1080/);
  });
});
