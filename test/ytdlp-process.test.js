import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { download } from "../src/infra/ytdlp.js";

const executable = fileURLToPath(new URL("../fixtures/fake-ytdlp.js", import.meta.url));

async function createTestConfig(url) {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "ytdown-"));

  return {
    config: {
      url,
      outputDirectory,
      quality: "best",
      connections: 1,
      compatibility: "original",
      executable,
      cookiesFromBrowser: undefined,
      cookiesFile: undefined,
      verbose: false,
    },
    dispose: () => rm(outputDirectory, { recursive: true, force: true }),
  };
}

describe("download process", () => {
  it("delivers structured events from the child process", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/success");
    const events = [];

    context.after(dispose);
    await download(config, { onEvent: (event) => events.push(event) });

    assert.deepEqual(
      events.map((event) => event.type),
      ["start", "progress", "processing", "complete"],
    );
    assert.deepEqual(
      events.find((event) => event.type === "progress"),
      {
        type: "progress",
        downloadedBytes: 50,
        totalBytes: 100,
        speedBytesPerSecond: 25,
        etaSeconds: 2,
      },
    );
  });

  it("classifies diagnostics from a failed child process", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/fail");

    context.after(dispose);
    await assert.rejects(download(config), {
      code: "RATE_LIMIT",
      message:
        "O site limitou temporariamente as requisições. Aguarde e tente novamente com menos conexões.",
    });
  });
});
