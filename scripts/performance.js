#!/usr/bin/env node

import { main } from "../src/cli/main.js";
import { createPerformanceMonitor, formatPerformanceReport } from "./performance-report.js";

const monitor = createPerformanceMonitor();
let exitCode = 1;

process.stdout.write("Monitoramento de performance ativado.\n\n");
monitor.start();

try {
  exitCode = await main();
} finally {
  const measurement = monitor.stop();
  const report = formatPerformanceReport(measurement, {
    columns: process.stdout.columns,
    exitCode,
  });

  process.stdout.write(`\n${report}\n`);
}

process.exitCode = exitCode;
