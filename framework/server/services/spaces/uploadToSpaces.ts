import { Body } from 'aws-sdk/clients/s3';
import path from 'path';
import os from 'os';

import promiseTimeout from 'utils/promiseTimeout';
import { API_POST_TIMEOUT } from 'settings';
import { SPACES_HOST } from 'consts/infra';
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
    ? 'p/'
    : `dev/${os.hostname()}/`;
  try {
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: `${prefix}${outPath}`,
          Body: file,
          ACL: 'public-read',
          CacheControl: `public, max-age=${maxAge}`,
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
        })
        .promise(),
      API_POST_TIMEOUT / 2,
      new Error('uploadToSpaces: uploading file timed out.'),
    );

    return `${SPACES_HOST}/${uploaded.Key}`;
  } catch (err) {
    ErrorLogger.warn(err, { ctx: 'uploadToSpaces' });
    throw new UserFacingError('Failed to upload file.', 500);
  }
}
