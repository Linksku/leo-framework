import Ffmpeg from 'fluent-ffmpeg';

export default async function getVideoMetadata(path: string) {
  const stream = await new Promise<Ffmpeg.FfprobeStream>((succ, fail) => {
    Ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) {
        fail(err);
        return;
      }

      const stream2 = metadata.streams.find(s => s.duration && s.height && s.width);
      if (!stream2) {
        fail(new HandledError('Can\'t get video dimensions.', 400));
        return;
      }

      succ(stream2);
    });
  });

  return {
    duration: (typeof stream.duration === 'number' ? stream.duration : null) as number | null,
    height: defined(stream.height),
    width: defined(stream.width),
  };
}
