import { parseArgs } from "node:util";

/** @typedef {import('../core/config.js').DownloadConfigInput} DownloadConfigInput */

const HELP = `Usage: ytdown <url> [options]

Download the best available media supported by yt-dlp.

Options:
  -o, --output <dir>       Destination directory (default: downloads)
  -q, --quality <value>    best, 720, 1080, 1440, or 2160 (default: best)
  -N, --connections <n>    Concurrent fragments from 1 to 32 (default: 8)
      --ytdlp <path>       yt-dlp executable (default: yt-dlp)
      --cookies-from-browser <browser>
                           Read cookies from a browser, such as chrome or firefox
      --cookies <file>     Read cookies from a Netscape-format file
  -h, --help               Show help
  -v, --version            Show version`;

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
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };
  if (positionals.length !== 1) {
    throw new TypeError("Provide exactly one media URL.");
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
    },
  };
}

export function getHelp() {
  return HELP;
}
