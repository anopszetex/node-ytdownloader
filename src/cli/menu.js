import { createInterface } from "node:readline/promises";
import { validateUrl } from "../core/validators.js";

const QUALITY_BY_CHOICE = Object.freeze({
  1: 1080,
  2: 720,
});

/** @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, question?: (query: string, options: { signal: AbortSignal }) => Promise<string> }} options */
function createTerminal(options) {
  if (options.question) {
    return { question: options.question, close: () => {} };
  }

  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;

  return createInterface({ input, output, terminal: Boolean(output.isTTY) });
}

/**
 * @param {import('node:readline/promises').Interface} terminal
 * @param {NodeJS.WritableStream} output
 * @param {AbortSignal} signal
 */
async function askUrl(terminal, output, signal) {
  while (true) {
    const answer = await terminal.question("URL do vídeo:\n> ", { signal });

    try {
      return validateUrl(answer.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      output.write(`Erro: ${message}\n\n`);
    }
  }
}

/**
 * @param {import('node:readline/promises').Interface} terminal
 * @param {NodeJS.WritableStream} output
 * @param {AbortSignal} signal
 */
async function askQuality(terminal, output, signal) {
  while (true) {
    output.write("Escolha a qualidade:\n");
    output.write("1. 1080p — recomendado\n");
    output.write("2. 720p\n");

    const answer = await terminal.question("> ", { signal });
    const quality = QUALITY_BY_CHOICE[answer.trim()];

    if (quality) {
      return quality;
    }

    output.write("Erro: Escolha 1 ou 2.\n\n");
  }
}

/**
 * @param {import('node:readline/promises').Interface} terminal
 * @param {AbortSignal} signal
 */
async function askConfirmation(terminal, signal) {
  const answer = await terminal.question("Iniciar download? [S/n]\n> ", { signal });
  const normalizedAnswer = answer.trim().toLowerCase();

  return normalizedAnswer === "" || normalizedAnswer === "s" || normalizedAnswer === "sim";
}

/**
 * @param {import('node:readline/promises').Interface} terminal
 * @param {NodeJS.WritableStream} output
 * @param {AbortSignal} signal
 */
async function askAuthenticationConfirmation(terminal, output, signal) {
  while (true) {
    const answer = await terminal.question("> ", { signal });
    const choice = answer.trim();

    if (choice === "1") {
      return true;
    }

    if (choice === "2") {
      return false;
    }

    output.write("Erro: Escolha 1 ou 2.\n");
  }
}

/**
 * Run the interactive download menu.
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, signal: AbortSignal, question?: (query: string, options: { signal: AbortSignal }) => Promise<string> }} options
 */
export async function openDownloadMenu(options) {
  const output = options.output ?? process.stdout;
  const terminal = createTerminal(options);

  try {
    output.write("YTDOWN\n\n");

    const url = await askUrl(terminal, output, options.signal);
    const quality = await askQuality(terminal, output, options.signal);

    output.write("\nResumo\n");
    output.write(`Qualidade: ${quality}p\n`);
    output.write("Destino: ./downloads\n\n");

    const confirmed = await askConfirmation(terminal, options.signal);

    if (!confirmed) {
      return undefined;
    }

    return Object.freeze({ url, quality });
  } finally {
    terminal.close();
  }
}

/**
 * Ask for consent before yt-dlp reads the user's Chrome session.
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, signal: AbortSignal, question?: (query: string, options: { signal: AbortSignal }) => Promise<string> }} options
 */
export async function confirmChromeAuthentication(options) {
  const output = options.output ?? process.stdout;
  const terminal = createTerminal(options);

  try {
    output.write("\nO site pediu uma sessão autenticada.\n");
    output.write("1. Tentar novamente com a sessão do Chrome\n");
    output.write("2. Cancelar\n");

    return await askAuthenticationConfirmation(terminal, output, options.signal);
  } finally {
    terminal.close();
  }
}
