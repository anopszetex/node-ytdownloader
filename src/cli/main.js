import { createConfig } from "../core/config.js";
import { DownloadError } from "../core/errors.js";
import { download } from "../infra/ytdlp.js";
import { confirmChromeAuthentication, openDownloadMenu } from "./menu.js";
import { createProgressReporter } from "./progress.js";

/** @param {string} message */
const print = (message) => process.stdout.write(`${message}\n`);

/** @param {string} message */
const printError = (message) => process.stderr.write(`Erro: ${message}\n`);

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
 * Run the interactive CLI.
 * @param {string[]} [argumentsList]
 * @returns {Promise<number>}
 */
export async function main(argumentsList = process.argv.slice(2)) {
  const controller = new AbortController();
  const abort = () => controller.abort();

  process.on("SIGINT", abort);
  process.on("SIGTERM", abort);

  try {
    if (argumentsList.length > 0) {
      throw new TypeError("Execute ytdown sem argumentos para abrir o menu.");
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new TypeError("Execute ytdown em um terminal interativo.");
    }

    const input = await openDownloadMenu({ signal: controller.signal });

    if (!input) {
      print("Download não iniciado.");
      return 0;
    }

    const config = createConfig(input);
    const reportProgress = createProgressReporter();

    await download(config, {
      signal: controller.signal,
      onEvent: reportProgress,
      onAuthenticationRequired: async () => {
        const confirmed = await confirmChromeAuthentication({ signal: controller.signal });

        return confirmed ? "chrome" : undefined;
      },
    });

    return 0;
  } catch (error) {
    if (controller.signal.aborted) {
      return reportFailure(new DownloadError("Download cancelled.", { code: "ABORTED" }));
    }

    return reportFailure(error);
  } finally {
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  }
}
