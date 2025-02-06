import path from 'path';
import type { Readable } from 'stream';

import promiseTimeout from 'utils/promiseTimeout';
import { DEFAULT_POST_API_TIMEOUT, DEFAULT_ASSETS_CACHE_TTL } from 'consts/server';
import {
  DO_SPACES_HOST,
  DO_SPACES_BUCKET,
  DO_SPACES_PREFIX,
} from 'config/serverConfig';
import getSpaces from './getSpaces';

type Props = {
  file: Buffer | Uint8Array | Readable,
  prefix?: string,
  path: string,
  contentType: string,
  isPrivate?: boolean,
  maxAge?: number,
  timeout?: number,
};

// todo: mid/mid verify paths are unique
// todo: mid/hard periodically remove unused files
export default async function uploadToSpaces({
  file,
  prefix = DO_SPACES_PREFIX,
  path: outPath,
  contentType,
  isPrivate,
  maxAge = DEFAULT_ASSETS_CACHE_TTL,
  timeout = DEFAULT_POST_API_TIMEOUT / 2,
}: Props): Promise<string> {
  if (process.env.SERVER !== 'production' && prefix.startsWith('p/')) {
    throw new Error('uploadToSpaces: can\'t upload to prod in dev');
  }

  try {
    const Spaces = await getSpaces();
    const uploaded = await promiseTimeout(
      Spaces
        .upload({
          Bucket: DO_SPACES_BUCKET,
          Key: prefix + outPath,
          Body: file,
          ACL: isPrivate
            ? 'private'
            : 'public-read',
          CacheControl: isPrivate
            ? undefined
            : `public,max-age=${maxAge}`,
          ContentType: contentType,
          ContentDisposition: `inline; filename=${path.basename(outPath)}`,
        })
        .promise(),
      {
        timeout,
        getErr: () => new Error('uploadToSpaces: uploading file timed out.'),
      },
    );

    return `${DO_SPACES_HOST}/${uploaded.Key}`;
  } catch (err) {
    ErrorLogger.warn(err, { ctx: 'uploadToSpaces' });
    throw new UserFacingError('Failed to upload file.', 500);
  }
}
