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
      quality: 1080,
    },
    dispose: () => rm(outputDirectory, { recursive: true, force: true }),
  };
}

describe("download process", () => {
  it("delivers structured events from the child process", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/success");
    const events = [];

    context.after(dispose);
    await download(config, { executable, onEvent: (event) => events.push(event) });

    assert.deepEqual(
      events.map((event) => event.type),
      ["start", "progress", "processing", "complete"],
    );
  });

  it("retries with conversion only when compatible formats are unavailable", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/fallback");
    const events = [];

    context.after(dispose);
    await download(config, { executable, onEvent: (event) => events.push(event) });

    assert.deepEqual(
      events.map((event) => event.type),
      ["fallback", "start", "progress", "processing", "complete"],
    );
  });

  it("does not retry unrelated failures", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/fail");
    const events = [];

    context.after(dispose);
    await assert.rejects(download(config, { executable, onEvent: (event) => events.push(event) }), {
      code: "RATE_LIMIT",
    });
    assert.deepEqual(events, [{ type: "failed" }]);
  });

  it("terminates an active child when cancelled", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/wait");
    const controller = new AbortController();

    context.after(dispose);

    const result = download(config, {
      executable,
      onEvent: (event) => {
        if (event.type === "start") {
          controller.abort();
        }
      },
      signal: controller.signal,
      terminationGracePeriod: 20,
    });

    await assert.rejects(result, { code: "ABORTED" });
  });

  it("forces termination when the child ignores the first signal", async (context) => {
    const { config, dispose } = await createTestConfig("https://example.com/ignore-termination");
    const controller = new AbortController();

    context.after(dispose);

    const result = download(config, {
      executable,
      onEvent: (event) => {
        if (event.type === "start") {
          controller.abort();
        }
      },
      signal: controller.signal,
      terminationGracePeriod: 20,
    });

    await assert.rejects(result, { code: "ABORTED" });
  });
});
