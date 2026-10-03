import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createConfig } from "../core/config.js";
import { DownloadError } from "../core/errors.js";
import { download } from "../infra/ytdlp.js";
import { getHelp, parseCliArgs } from "./args.js";
import { createProgressReporter } from "./progress.js";

/** @param {string} message */
const print = (message) => process.stdout.write(`${message}\n`);

/** @param {string} message */
const printError = (message) => process.stderr.write(`Erro: ${message}\n`);

async function getVersion() {
  const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  return pkg.version;
}

/** @param {{ kind: string }} command */
async function runInformationCommand(command) {
  if (command.kind === "help") {
    print(getHelp());
    return 0;
  }

  if (command.kind === "version") {
    print(await getVersion());
    return 0;
  }

  return undefined;
}

/** @param {boolean} verbose */
function createDiagnosticWriter(verbose) {
  if (!verbose) {
    return undefined;
  }

  return (message) => process.stderr.write(`[yt-dlp] ${message}\n`);
}

/** @param {import('../core/config.js').DownloadConfigInput} input */
async function runDownload(input) {
  const config = createConfig(input);
  const controller = new AbortController();
  const abort = () => controller.abort();
  const reportProgress = createProgressReporter();
  const printDiagnostic = createDiagnosticWriter(config.verbose);

  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);

  try {
    await download(config, {
      signal: controller.signal,
      onEvent: reportProgress,
      onDiagnostic: printDiagnostic,
    });

    return 0;
  } finally {
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  }
}

/** @param {unknown} error */
function reportFailure(error) {
  if (error instanceof DownloadError && error.code === "ABORTED") {
    printError("Download cancelado.");
    return 130;
  }

  printError(error instanceof Error ? error.message : String(error));
  return 1;
}

/**
 * Run the CLI.
 * @param {string[]} [argv]
 * @returns {Promise<number>}
 */
export async function main(argv = process.argv.slice(2)) {
  try {
    const command = parseCliArgs(argv);
    const informationResult = await runInformationCommand(command);

    if (informationResult !== undefined) {
      return informationResult;
    }

    return await runDownload(command.input);
  } catch (error) {
    return reportFailure(error);
  }
}
