import Ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';

export default async function getVideoMetadata(video: FfmpegCommand) {
  const stream = await new Promise<Ffmpeg.FfprobeStream>((succ, fail) => {
    video.ffprobe((err, metadata) => {
      if (err) {
        fail(err);
        return;
      }

      const stream2 = metadata.streams.find(s => s.duration && s.height && s.width);
      if (!stream2) {
        fail(new UserFacingError('Can\'t read video info.', 400));
        return;
      }

      succ(stream2);
    });
  });

  let fps: number | undefined;
  if (stream.r_frame_rate) {
    const parts = stream.r_frame_rate.split('/');
    const num = TS.parseIntOrNull(parts[0]);
    const denom = TS.parseIntOrNull(parts[1]);
    if (num && denom && num > denom) {
      fps = num / denom;
    }
  }

  return {
    duration: (typeof stream.duration === 'number' ? stream.duration : null) as number | null,
    height: TS.defined(stream.height),
    width: TS.defined(stream.width),
    fps,
  };
}
