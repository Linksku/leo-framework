import path from 'path';

import Spaces from 'services/Spaces';
import promiseTimeout from 'lib/promiseTimeout';

type Props = {
  file: string | Buffer,
  outPath: string,
  contentType: string,
};

export default async function uploadToSpaces({
  file,
  outPath,
  contentType,
}: Props): Promise<string> {
  try {
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: process.env.DO_SPACES_BUCKET as string,
          Key: outPath,
          ACL: 'public-read',
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
          Body: file,
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
