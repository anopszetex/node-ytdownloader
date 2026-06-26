import { spawn } from "node:child_process";

const url = process.argv[2];

if (!url) {
  console.error('uso: node index.js "<url>"');
  process.exit(1);
}

const formatSel =
  "(bv*[height>=2160]/bv*[height>=1440]/bv*[height>=1080])+(ba/b)";

const args = [
  url,
  "-f",
  formatSel,
  "-N",
  "16", // até 8 conexões/fragmentos em paralelo
  "--merge-output-format",
  "mp4", // usa ffmpeg automaticamente para mux
  "-o",
  "output_4k.%(ext)s",
  "--no-progress",
];

const ytdlp = spawn("yt-dlp", args, { stdio: "inherit" });

process.on("SIGINT", () => {
  console.log("\n⛔ cancelado");
  if (ytdlp?.pid) {
    try {
      ytdlp.kill("SIGKILL");
    } catch {}
  }
  process.exit(130);
});

ytdlp.on("close", (code) => {
  if (code === 0) {
    console.log("✅ output_4k.mp4");
    return;
  }

  console.error("💥 yt-dlp saiu com código", code);
});
