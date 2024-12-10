import promiseTimeout from 'utils/promiseTimeout';
import { API_POST_TIMEOUT } from 'consts/server';
import { DO_SPACES_BUCKET } from 'config/serverConfig';
import getSpaces from './getSpaces';

export default async function deleteFromSpaces(urlOrPath: string): Promise<void> {
  let key = urlOrPath.startsWith('https://')
    ? new URL(urlOrPath).pathname
    : urlOrPath;
  if (key.startsWith('/')) {
    key = key.slice(1);
  }

  if (process.env.SERVER !== 'production' && key.startsWith('p/')) {
    throw new Error('deleteFromSpaces: can\'t delete from prod in dev');
  }

  const Spaces = await getSpaces();
  try {
    await promiseTimeout(
      Spaces
        .deleteObject({
          Bucket: DO_SPACES_BUCKET,
          Key: key,
        })
        .promise(),
      {
        timeout: API_POST_TIMEOUT / 2,
        getErr: () => new Error('deleteFromSpaces: deleting file timed out.'),
      },
    );
  } catch (err) {
    ErrorLogger.warn(err, { ctx: 'deleteFromSpaces' });
    throw new UserFacingError('Failed to delete file.', 500);
  }
}
