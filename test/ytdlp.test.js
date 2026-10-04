import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectCompatibleFormat, selectConversionFormat } from "../src/core/formats.js";
import { buildYtdlpArgs } from "../src/infra/ytdlp.js";

const config = {
  url: "https://example.com/video",
  outputDirectory: "/tmp/downloads",
  quality: 1080,
};

describe("comando do yt-dlp", () => {
  it("seleciona primeiro H.264 e AAC sem transcodificação", () => {
    const format = selectCompatibleFormat(1080);
    const argumentsList = buildYtdlpArgs(config);

    assert.match(format, /avc1\|h264/);
    assert.match(format, /mp4a\|aac/);
    assert.equal(argumentsList.includes("--recode-video"), false);
    assert.equal(argumentsList[argumentsList.indexOf("--merge-output-format") + 1], "mp4");
  });

  it("monta uma conversão alternativa limitada à resolução escolhida", () => {
    const format = selectConversionFormat(720);
    const argumentsList = buildYtdlpArgs({ ...config, quality: 720 }, { convert: true });
    const postprocessorArguments = argumentsList[argumentsList.indexOf("--postprocessor-args") + 1];

    assert.match(format, /height<=720/);
    assert.equal(argumentsList[argumentsList.indexOf("--recode-video") + 1], "mp4");
    assert.equal(argumentsList[argumentsList.indexOf("--remux-video") + 1], "mkv");
    assert.match(postprocessorArguments, /libx264/);
    assert.match(postprocessorArguments, /-c:a aac/);
  });

  it("grava diretamente sem sobrescrever arquivos", () => {
    const argumentsList = buildYtdlpArgs(config);

    assert.ok(argumentsList.includes("--paths"));
    assert.ok(argumentsList.includes("/tmp/downloads"));
    assert.ok(argumentsList.includes("--no-overwrites"));
    assert.ok(argumentsList.includes("--no-post-overwrites"));
    assert.equal(argumentsList.at(-1), "https://example.com/video");
    assert.equal(argumentsList.includes("--exec"), false);
  });

  it("envia autenticação do navegador somente quando solicitada", () => {
    const anonymousArguments = buildYtdlpArgs(config);
    const authenticatedArguments = buildYtdlpArgs(config, { cookiesFromBrowser: "chrome" });

    assert.equal(anonymousArguments.includes("--cookies-from-browser"), false);
    assert.deepEqual(authenticatedArguments.slice(-3), [
      "--cookies-from-browser",
      "chrome",
      config.url,
    ]);
  });
});
