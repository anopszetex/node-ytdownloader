import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";

try {
  await access(new URL("../.git", import.meta.url));
} catch {
  process.exitCode = 0;
}

if (process.exitCode === undefined) {
  const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "inherit",
    windowsHide: true,
  });
  process.exitCode = result.status ?? 1;
}
