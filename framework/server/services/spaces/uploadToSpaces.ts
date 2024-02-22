import type { Readable } from 'stream';
import path from 'path';

import promiseTimeout from 'utils/promiseTimeout';
import { API_POST_TIMEOUT, DEFAULT_ASSETS_CACHE_TTL } from 'consts/server';
import {
  DO_SPACES_HOST,
  DO_SPACES_BUCKET,
  DO_SPACES_PREFIX,
} from 'config/serverConfig';
import Spaces from './Spaces';

type Props = {
  file: Buffer | Uint8Array | Readable,
  prefix?: string,
  path: string,
  contentType: string,
  maxAge?: number,
};

// todo: mid/mid verify paths are unique
// todo: mid/hard periodically remove unused files
export default async function uploadToSpaces({
  file,
  prefix = DO_SPACES_PREFIX,
  path: outPath,
  contentType,
  maxAge = DEFAULT_ASSETS_CACHE_TTL,
}: Props): Promise<string> {
  if (process.env.SERVER !== 'production' && prefix.startsWith('p/')) {
    throw new Error('uploadToSpaces: can\'t upload to prod in dev');
  }

  try {
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: DO_SPACES_BUCKET,
          Key: prefix + outPath,
          Body: file,
          ACL: 'public-read',
          CacheControl: `public,max-age=${maxAge}`,
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
        })
        .promise(),
      API_POST_TIMEOUT / 2,
      new Error('uploadToSpaces: uploading file timed out.'),
    );

    return `${DO_SPACES_HOST}/${uploaded.Key}`;
  } catch (err) {
    ErrorLogger.warn(err, { ctx: 'uploadToSpaces' });
    throw new UserFacingError('Failed to upload file.', 500);
  }
}
