import { Body } from 'aws-sdk/clients/s3';
import path from 'path';
import os from 'os';

import promiseTimeout from 'utils/promiseTimeout';
import { HTTP_TIMEOUT } from 'settings';
import Spaces from './Spaces';

type Props = {
  file: Body,
  path: string,
  contentType: string,
  maxAge?: number,
};

// todo: mid/mid verify Spaces paths are unique, periodically remove unused files
export default async function uploadToSpaces({
  file,
  path: outPath,
  contentType,
  maxAge = 7 * 24 * 60 * 60,
}: Props): Promise<string> {
  const prefix = process.env.PRODUCTION
    ? 'prod/'
    : `dev/${os.hostname()}/`;
  try {
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: TS.defined(process.env.DO_SPACES_BUCKET),
          Key: `${prefix}${outPath}`,
          Body: file,
          ACL: 'public-read',
          CacheControl: `public, max-age=${maxAge}`,
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
        })
        .promise(),
      HTTP_TIMEOUT / 2,
      new Error('Uploading file timed out.'),
    );

    return uploaded.Location;
  } catch (err) {
    ErrorLogger.warn(err, 'Failed to upload file to Spaces');
    throw new HandledError('Failed to upload file.', 500);
  }
}
