const BEST_FORMAT = "bestvideo*+bestaudio[ext=m4a]/bestvideo*+bestaudio/best";

/** @param {720 | 1080 | 1440 | 2160} quality */
function selectBoundedFormat(quality) {
  return [
    `bestvideo*[height<=${quality}]+bestaudio[ext=m4a]`,
    `bestvideo*[height<=${quality}]+bestaudio`,
    `best[height<=${quality}]`,
  ].join("/");
}

/** @param {'best' | 720 | 1080 | 1440 | 2160} quality */
function selectUniversalFormat(quality) {
  if (quality === "best") {
    return [
      "bestvideo*[height>1080]+bestaudio[ext=m4a]",
      "bestvideo*[height<=1080][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]",
      BEST_FORMAT,
    ].join("/");
  }

  if (quality <= 1080) {
    const compatibleFormat = `bestvideo*[height<=${quality}][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]`;

    return `${compatibleFormat}/${selectBoundedFormat(quality)}`;
  }

  return selectBoundedFormat(quality);
}

/**
 * Build a yt-dlp format selector without transcoding.
 * @param {'best' | 720 | 1080 | 1440 | 2160} quality
 * @param {'original' | 'universal'} compatibility
 */
export function selectFormat(quality, compatibility) {
  if (compatibility === "universal") {
    return selectUniversalFormat(quality);
  }

  if (quality === "best") {
    return BEST_FORMAT;
  }

  return selectBoundedFormat(quality);
}
