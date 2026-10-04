#!/usr/bin/env node

const argumentsList = process.argv.slice(2);
const outputDirectoryIndex = argumentsList.indexOf("--paths") + 1;
const outputDirectory = argumentsList[outputDirectoryIndex];
const url = argumentsList.at(-1);
const shouldFail = url.includes("fail");
const shouldFallback = url.includes("fallback") && !argumentsList.includes("--recode-video");
const shouldRequireAuthentication =
  url.includes("auth") && !argumentsList.includes("--cookies-from-browser");
const shouldIgnoreTermination = url.includes("ignore-termination");
const shouldWait = url.includes("wait") || shouldIgnoreTermination;

if (shouldFail) {
  process.stderr.write("ERROR: HTTP Error 429: Too Many Requests\n");
  process.exitCode = 1;
}

if (shouldFallback) {
  process.stderr.write("ERROR: Requested format is not available\n");
  process.exitCode = 1;
}

if (shouldRequireAuthentication) {
  process.stderr.write("ERROR: Sign in to confirm you’re not a bot\n");
  process.exitCode = 1;
}

if (shouldWait) {
  process.stdout.write("YTDOWN_EVENT\tstart\tMídia de teste\n");

  if (shouldIgnoreTermination) {
    process.on("SIGTERM", () => {});
  }

  if (!shouldIgnoreTermination) {
    process.on("SIGTERM", () => process.exit(0));
  }

  setInterval(() => {}, 1_000);
}

if (!shouldFail && !shouldFallback && !shouldRequireAuthentication && !shouldWait) {
  process.stdout.write("YTDOWN_EVENT\tstart\tMídia de teste\n");
  process.stderr.write("YTDOWN_PROGRESS\t50\t100\t25\t2\n");
  process.stderr.write("YTDOWN_EVENT\tprocessing\n");
  process.stdout.write(`YTDOWN_EVENT\tcomplete\t${outputDirectory}/media.mp4\n`);
}
