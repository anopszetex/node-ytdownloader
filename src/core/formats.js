const H264_VIDEO = "[vcodec~='^(avc1|h264)']";
const AAC_AUDIO = "[acodec~='^(mp4a|aac)']";

/**
 * Select an editor-friendly H.264 and AAC format without transcoding.
 * @param {720 | 1080} quality
 */
export function selectCompatibleFormat(quality) {
  const separateStreams = `bestvideo[height<=${quality}]${H264_VIDEO}+bestaudio${AAC_AUDIO}`;
  const combinedStream = `best[height<=${quality}][ext=mp4]${H264_VIDEO}${AAC_AUDIO}`;

  return `${separateStreams}/${combinedStream}`;
}

/**
 * Select the best bounded source for conversion, including silent videos.
 * @param {720 | 1080} quality
 */
export function selectConversionFormat(quality) {
  return [
    `bestvideo[height<=${quality}]+bestaudio`,
    `best[height<=${quality}]`,
    `bestvideo[height<=${quality}]`,
  ].join("/");
}
