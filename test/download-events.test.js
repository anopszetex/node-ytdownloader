import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDownloadEvent } from "../src/core/download-events.js";

describe("eventos de download", () => {
  it("interpreta o progresso numérico", () => {
    const event = parseDownloadEvent("YTDOWN_PROGRESS\t512\t1024\t256\t2");

    assert.deepEqual(event, {
      type: "progress",
      downloadedBytes: 512,
      totalBytes: 1024,
      speedBytesPerSecond: 256,
      etaSeconds: 2,
    });
    assert.ok(Object.isFrozen(event));
  });

  it("mantém explícitos os valores de progresso indisponíveis", () => {
    const event = parseDownloadEvent("YTDOWN_PROGRESS\t512\tNA\tNA\tNA");

    assert.equal(event.totalBytes, undefined);
    assert.equal(event.speedBytesPerSecond, undefined);
    assert.equal(event.etaSeconds, undefined);
  });

  it("interpreta os eventos do ciclo de vida", () => {
    assert.deepEqual(parseDownloadEvent("YTDOWN_EVENT\tstart\tA title"), {
      type: "start",
      title: "A title",
    });
    assert.deepEqual(parseDownloadEvent("YTDOWN_EVENT\tprocessing"), {
      type: "processing",
    });
    assert.deepEqual(parseDownloadEvent("YTDOWN_EVENT\tcomplete\t/tmp/video.webm"), {
      type: "complete",
      path: "/tmp/video.webm",
    });
  });

  it("ignora saídas externas ao protocolo privado", () => {
    assert.equal(parseDownloadEvent("ERROR: unavailable"), undefined);
    assert.equal(parseDownloadEvent("YTDOWN_EVENT\tunknown"), undefined);
  });
});
