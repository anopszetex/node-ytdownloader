/**
 * Build a yt-dlp format selector that preserves source codecs.
 * @param {'best' | 720 | 1080 | 1440 | 2160} quality
 */
export function selectFormat(quality) {
  if (quality === "best") {
    return "bestvideo*+bestaudio[ext=m4a]/bestvideo*+bestaudio/best";
  }

  return [
    `bestvideo*[height<=${quality}]+bestaudio[ext=m4a]`,
    `bestvideo*[height<=${quality}]+bestaudio`,
    `best[height<=${quality}]`,
  ].join("/");
}
