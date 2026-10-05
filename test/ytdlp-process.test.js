import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { download } from "../src/infra/ytdlp.js";

const executable = fileURLToPath(new URL("../fixtures/fake-ytdlp.js", import.meta.url));

async function createTestConfig(context, url) {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "ytdown-"));

  context.after(() => rm(outputDirectory, { recursive: true, force: true }));

  return {
    url,
    outputDirectory,
    quality: 1080,
  };
}

describe("processo de download", () => {
  it("entrega eventos estruturados do processo filho", async (context) => {
    const config = await createTestConfig(context, "https://example.com/success");
    const events = [];

    await download(config, { executable, onEvent: (event) => events.push(event) });

    assert.deepEqual(
      events.map((event) => event.type),
      ["start", "progress", "processing", "complete"],
    );
  });

  it("tenta converter somente quando formatos compatíveis estão indisponíveis", async (context) => {
    const config = await createTestConfig(context, "https://example.com/fallback");
    const events = [];

    await download(config, { executable, onEvent: (event) => events.push(event) });

    assert.deepEqual(
      events.map((event) => event.type),
      ["fallback", "start", "progress", "processing", "complete"],
    );
  });

  it("não repete falhas sem relação com o formato", async (context) => {
    const config = await createTestConfig(context, "https://example.com/fail");
    const events = [];

    await assert.rejects(download(config, { executable, onEvent: (event) => events.push(event) }), {
      code: "RATE_LIMIT",
    });
    assert.deepEqual(events, [{ type: "failed" }]);
  });

  it("repete com o navegador autorizado pelo usuário", async (context) => {
    const config = await createTestConfig(context, "https://example.com/auth");
    const events = [];
    let authenticationRequests = 0;

    await download(config, {
      executable,
      onAuthenticationRequired: async () => {
        authenticationRequests += 1;
        return "chrome";
      },
      onEvent: (event) => events.push(event),
    });

    assert.equal(authenticationRequests, 1);
    assert.deepEqual(
      events.map((event) => event.type),
      ["start", "progress", "processing", "complete"],
    );
  });

  it("não repete a autenticação sem consentimento", async (context) => {
    const config = await createTestConfig(context, "https://example.com/auth");
    const events = [];

    await assert.rejects(
      download(config, {
        executable,
        onAuthenticationRequired: async () => undefined,
        onEvent: (event) => events.push(event),
      }),
      { code: "AUTH_REQUIRED" },
    );
    assert.deepEqual(events, [{ type: "failed" }]);
  });

  it("encerra um processo filho ativo quando cancelado", async (context) => {
    const config = await createTestConfig(context, "https://example.com/wait");
    const controller = new AbortController();

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

  it("força o encerramento quando o processo ignora o primeiro sinal", async (context) => {
    const config = await createTestConfig(context, "https://example.com/ignore-termination");
    const controller = new AbortController();

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
