import path from 'path';

import Spaces from 'services/Spaces';
import promiseTimeout from 'lib/promiseTimeout';

type Props = {
  file: string | Buffer,
  outPath: string,
  contentType: string,
};

// todo: mid/mid verify Spaces paths are unique, periodically remove unused files
export default async function uploadToSpaces({
  file,
  outPath,
  contentType,
}: Props): Promise<string> {
  try {
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: TS.defined(process.env.DO_SPACES_BUCKET),
          Key: outPath,
          Body: file,
          ACL: 'public-read',
          CacheControl: `public, max-age=${7 * 24 * 60 * 60}`,
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
        })
        .promise(),
      10_000,
      new Error('Uploading file timed out.'),
    );

    return uploaded.Location;
  } catch (err) {
    console.error(err);
    throw new HandledError('Failed to upload file.', 500);
  }
}
