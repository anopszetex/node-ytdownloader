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
const printError = (message) => process.stderr.write(`Error: ${message}\n`);

async function getVersion() {
  const packagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  return pkg.version;
}

/**
 * Run the CLI.
 * @param {string[]} [argv]
 * @returns {Promise<number>}
 */
export async function main(argv = process.argv.slice(2)) {
  try {
    const command = parseCliArgs(argv);
    if (command.kind === "help") {
      print(getHelp());
      return 0;
    }
    if (command.kind === "version") {
      print(await getVersion());
      return 0;
    }

    const config = createConfig(command.input);
    const controller = new AbortController();
    const abort = () => controller.abort();
    const reportProgress = createProgressReporter();

    process.once("SIGINT", abort);
    process.once("SIGTERM", abort);

    try {
      await download(config, {
        signal: controller.signal,
        onEvent: reportProgress,
      });

      return 0;
    } finally {
      process.off("SIGINT", abort);
      process.off("SIGTERM", abort);
    }
  } catch (error) {
    if (error instanceof DownloadError && error.code === "ABORTED") {
      printError("Download cancelled.");
      return 130;
    }

    printError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
