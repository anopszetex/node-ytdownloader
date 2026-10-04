import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { openDownloadMenu } from "../src/cli/menu.js";

function createMenuInput(lines) {
  const output = new PassThrough();
  const chunks = [];
  const answers = [...lines];

  output.on("data", (chunk) => chunks.push(chunk));

  return {
    output,
    question: async () => answers.shift() ?? "",
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

describe("openDownloadMenu", () => {
  it("collects a confirmed download", async () => {
    const terminal = createMenuInput(["https://example.com/video", "1", ""]);
    const controller = new AbortController();

    const input = await openDownloadMenu({ ...terminal, signal: controller.signal });

    assert.deepEqual(input, {
      url: "https://example.com/video",
      quality: 1080,
    });
    assert.match(terminal.text(), /Destino: \.\/downloads/);
  });

  it("repeats invalid URL and quality questions", async () => {
    const terminal = createMenuInput(["not-a-url", "https://example.com/video", "9", "2", "sim"]);
    const controller = new AbortController();

    const input = await openDownloadMenu({ ...terminal, signal: controller.signal });

    assert.equal(input.quality, 720);
    assert.match(terminal.text(), /URL deve ser válida/);
    assert.match(terminal.text(), /Escolha 1 ou 2/);
  });

  it("returns no input when the user declines", async () => {
    const terminal = createMenuInput(["https://example.com/video", "1", "n"]);
    const controller = new AbortController();

    const input = await openDownloadMenu({ ...terminal, signal: controller.signal });

    assert.equal(input, undefined);
  });
});
