import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { confirmChromeAuthentication, openDownloadMenu } from "../src/cli/menu.js";

function createMenuInput(lines) {
  const output = new PassThrough();
  const chunks = [];
  const answers = [...lines];
  const controller = new AbortController();

  output.on("data", (chunk) => chunks.push(chunk));

  return {
    output,
    signal: controller.signal,
    question: async () => answers.shift() ?? "",
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

describe("menu de download", () => {
  it("coleta um download confirmado", async () => {
    const terminal = createMenuInput(["https://example.com/video", "1", ""]);

    const input = await openDownloadMenu(terminal);

    assert.deepEqual(input, {
      url: "https://example.com/video",
      quality: 1080,
    });
    assert.match(terminal.text(), /Destino: \.\/downloads/);
  });

  it("repete as perguntas de URL e qualidade inválidas", async () => {
    const terminal = createMenuInput(["not-a-url", "https://example.com/video", "9", "2", "sim"]);

    const input = await openDownloadMenu(terminal);

    assert.equal(input.quality, 720);
    assert.match(terminal.text(), /URL deve ser válida/);
    assert.match(terminal.text(), /Escolha 1 ou 2/);
  });

  it("não retorna uma entrada quando o usuário recusa", async () => {
    const terminal = createMenuInput(["https://example.com/video", "1", "n"]);

    const input = await openDownloadMenu(terminal);

    assert.equal(input, undefined);
  });
});

describe("confirmação de autenticação do Chrome", () => {
  it("solicita consentimento e valida a escolha", async () => {
    const terminal = createMenuInput(["invalid", "1"]);

    const confirmed = await confirmChromeAuthentication(terminal);

    assert.equal(confirmed, true);
    assert.match(terminal.text(), /sessão do Chrome/);
    assert.match(terminal.text(), /Escolha 1 ou 2/);
  });

  it("respeita a recusa de autenticação", async () => {
    const terminal = createMenuInput(["2"]);

    const confirmed = await confirmChromeAuthentication(terminal);

    assert.equal(confirmed, false);
  });
});
