import { parseArgs } from "node:util";

/** @typedef {import('../core/config.js').DownloadConfigInput} DownloadConfigInput */

const HELP = `Uso: ytdown <url> [opções]

Baixa a melhor mídia disponível por meio do yt-dlp.

Opções:
  -o, --output <dir>       Pasta de destino (padrão: downloads)
  -q, --quality <value>    best, 720, 1080, 1440 ou 2160 (padrão: best)
  -N, --connections <n>    Fragmentos simultâneos de 1 a 32 (padrão: 8)
      --ytdlp <path>       Executável do yt-dlp (padrão: yt-dlp)
      --cookies-from-browser <browser>
                           Lê cookies de um navegador, como chrome ou firefox
      --cookies <file>     Lê cookies de um arquivo no formato Netscape
      --verbose            Exibe os logs técnicos do yt-dlp
  -h, --help               Exibe ajuda
  -v, --version            Exibe a versão`;

/**
 * Parse command-line arguments without performing I/O.
 * @param {string[]} args
 * @returns {{ kind: 'help' | 'version' } | { kind: 'download', input: DownloadConfigInput }}
 */
export function parseCliArgs(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      output: { type: "string", short: "o", default: "downloads" },
      quality: { type: "string", short: "q", default: "best" },
      connections: { type: "string", short: "N", default: "8" },
      ytdlp: { type: "string", default: "yt-dlp" },
      "cookies-from-browser": { type: "string" },
      cookies: { type: "string" },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.help) {
    return { kind: "help" };
  }

  if (values.version) {
    return { kind: "version" };
  }

  if (positionals.length !== 1) {
    throw new TypeError("Informe exatamente uma URL de mídia.");
  }

  return {
    kind: "download",
    input: {
      url: positionals[0],
      outputDirectory: values.output,
      quality: values.quality,
      connections: values.connections,
      executable: values.ytdlp,
      cookiesFromBrowser: values["cookies-from-browser"],
      cookiesFile: values.cookies,
      verbose: values.verbose,
    },
  };
}

export function getHelp() {
  return HELP;
}
