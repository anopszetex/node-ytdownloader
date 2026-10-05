import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateCpuPercentage,
  createPerformanceMonitor,
  createSparkline,
  formatPerformanceReport,
} from "../scripts/performance-report.js";

describe("relatório de performance", () => {
  it("calcula o percentual de CPU entre duas amostras", () => {
    const percentage = calculateCpuPercentage(
      { user: 1_000, system: 500 },
      { user: 21_000, system: 5_500 },
      100,
    );

    assert.equal(percentage, 25);
    assert.equal(calculateCpuPercentage({ user: 0, system: 0 }, { user: 10, system: 10 }, 0), 0);
  });

  it("cria um gráfico compacto e limita sua largura", () => {
    assert.equal(createSparkline([], 10), "—");
    assert.equal(createSparkline([5, 5, 5], 10), "▄▄▄");
    assert.equal(createSparkline([0, 10, 20], 10), "▁▅█");
    assert.equal(createSparkline([0, 10, 20, 30], 2).length, 2);
  });

  it("formata resumo, métricas e estado da execução", () => {
    const report = formatPerformanceReport(
      {
        durationMilliseconds: 65_000,
        samples: [
          { elapsedMilliseconds: 0, cpuPercentage: 10, rssBytes: 10 * 1024 * 1024 },
          { elapsedMilliseconds: 65_000, cpuPercentage: 30, rssBytes: 20 * 1024 * 1024 },
        ],
      },
      { columns: 40, exitCode: 130 },
    );

    assert.match(report, /Performance — processo Node/);
    assert.match(report, /média 20\.0% • pico 30\.0%/);
    assert.match(report, /média 15\.0 MiB • pico 20\.0 MiB/);
    assert.match(report, /Duração {2}01:05/);
    assert.match(report, /Status {3}cancelada/);
  });
});

describe("monitor de performance", () => {
  it("coleta amostras e encerra o agendamento", () => {
    const times = [0, 0, 250, 500];
    const cpuUsages = [
      { user: 0, system: 0 },
      { user: 0, system: 0 },
      { user: 25_000, system: 0 },
      { user: 50_000, system: 0 },
    ];
    let scheduledSample;
    let cancelledTimer;
    const timer = {};
    const monitor = createPerformanceMonitor({
      cancelSchedule: (timerToCancel) => {
        cancelledTimer = timerToCancel;
      },
      now: () => times.shift(),
      readCpuUsage: () => cpuUsages.shift(),
      readMemoryUsage: () => ({ rss: 10 * 1024 * 1024 }),
      schedule: (callback) => {
        scheduledSample = callback;
        return timer;
      },
    });

    monitor.start();
    scheduledSample();
    const measurement = monitor.stop();

    assert.equal(cancelledTimer, timer);
    assert.equal(measurement.durationMilliseconds, 500);
    assert.equal(measurement.samples.length, 3);
    assert.equal(measurement.samples[1].cpuPercentage, 10);
    assert.ok(Object.isFrozen(measurement.samples));
  });
});
