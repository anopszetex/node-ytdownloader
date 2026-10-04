import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculatePercentage,
  createBar,
  createProgressReporter,
  formatBytes,
  formatDuration,
  formatProgress,
  sanitizeTerminalText,
} from "../src/cli/progress.js";

function createOutput(interactive) {
  const chunks = [];

  return {
    chunks,
    output: {
      columns: 80,
      isTTY: interactive,
      write(chunk) {
        chunks.push(chunk);
      },
    },
  };
}

describe("formatação do progresso", () => {
  it("formata valores de bytes e tempo", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1_048_576), "1.0 MiB");
    assert.equal(formatBytes(undefined), "—");
    assert.equal(formatDuration(65), "01:05");
  });

  it("calcula percentuais limitados e barras", () => {
    assert.equal(calculatePercentage(512, 1024), 50);
    assert.equal(calculatePercentage(1200, 1000), 100);
    assert.equal(calculatePercentage(1, undefined), undefined);
    assert.equal(createBar(50, 10), "█████░░░░░");
  });

  it("formata uma linha completa de progresso em português", () => {
    const line = formatProgress({
      downloadedBytes: 512,
      totalBytes: 1024,
      speedBytesPerSecond: 256,
      etaSeconds: 2,
    });

    assert.match(line, /^Baixando \[/);
    assert.match(line, /50%/);
    assert.match(line, /256 B\/s/);
    assert.match(line, /ETA 00:02/);
  });

  it("remove sequências de controle do terminal em textos remotos", () => {
    assert.equal(sanitizeTerminalText("safe\u001B[31m red\u0007\nnext"), "safe red  next");
  });
});

describe("relatório de progresso", () => {
  it("atualiza uma linha do terminal no modo interativo", () => {
    const { chunks, output } = createOutput(true);
    const report = createProgressReporter({ output, interactive: true });

    report({
      type: "progress",
      downloadedBytes: 50,
      totalBytes: 100,
      speedBytesPerSecond: 10,
      etaSeconds: 5,
    });

    assert.ok(chunks.join("").startsWith("\r\u001B[2KBaixando"));
  });

  it("limita a saída simples por faixas de percentual", () => {
    const { chunks, output } = createOutput(false);
    const report = createProgressReporter({ output, interactive: false });
    const progress = (downloadedBytes) => ({
      type: "progress",
      downloadedBytes,
      totalBytes: 100,
      speedBytesPerSecond: 10,
      etaSeconds: 5,
    });

    report(progress(1));
    report(progress(5));
    report(progress(11));

    assert.equal(chunks.length, 2);
  });

  it("exibe mensagens do ciclo de vida em português", () => {
    const { chunks, output } = createOutput(false);
    const report = createProgressReporter({ output, interactive: false });

    report({ type: "start", title: "Exemplo" });
    report({ type: "processing" });
    report({ type: "processing" });
    report({ type: "complete", path: "/tmp/exemplo.webm" });

    assert.equal(
      chunks.join(""),
      "Preparando download…\nVídeo: Exemplo\n\nFinalizando MP4…\n" +
        "✓ Download concluído\n  Arquivo: /tmp/exemplo.webm\n",
    );
  });
});
