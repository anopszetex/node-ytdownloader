#!/usr/bin/env node

const argumentsList = process.argv.slice(2);
const outputDirectoryIndex = argumentsList.indexOf("--paths") + 1;
const outputDirectory = argumentsList[outputDirectoryIndex];
const url = argumentsList.at(-1);
const shouldFail = url.includes("fail");

if (shouldFail) {
  process.stderr.write("ERROR: HTTP Error 429: Too Many Requests\n");
  process.exitCode = 1;
}

if (!shouldFail) {
  process.stdout.write("YTDOWN_EVENT\tstart\tMídia de teste\n");
  process.stderr.write("YTDOWN_PROGRESS\t50\t100\t25\t2\n");
  process.stderr.write("YTDOWN_EVENT\tprocessing\n");
  process.stdout.write(`YTDOWN_EVENT\tcomplete\t${outputDirectory}/media.webm\n`);
}
