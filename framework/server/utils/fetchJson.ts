import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import safeParseJson from 'utils/safeParseJson';
import ApiError from 'core/ApiError';
import fetchTimeout from './fetchTimeout';
import fetchShuffledCiphers from './fetchShuffledCiphers';

export default async function fetchJson(
  url: string,
  allOpts?: Parameters<typeof fetchTimeout>[1] & { shuffleCiphers?: boolean },
): Promise<{
  data?: unknown,
  status: number,
}> {
  const { shuffleCiphers, ...opts } = allOpts || {};

  const headers = { ...opts?.headers };
  let contentType: string | undefined;
  if (opts?.headers) {
    const contentTypeKey = Object.keys(opts.headers)
      .find(k => k.toLowerCase() === 'content-type');
    if (contentTypeKey) {
      contentType = opts.headers[contentTypeKey];
      delete headers[contentTypeKey];
    }
  }
  if (!contentType
    && opts?.params
    && opts.method
    && opts.method !== 'GET') {
    contentType = opts.formData
      ? 'application/x-www-form-urlencoded'
      : 'application/json';
  }
  if (contentType) {
    headers['content-type'] = contentType;
  }

  const { text, status } = await (shuffleCiphers
    ? fetchShuffledCiphers(
      url,
      {
        ...opts,
        headers,
      },
    )
    : fetchTimeout(
      url,
      {
        ...opts,
        headers,
      },
    ));
  if (!text) {
    return { status };
  }

  const data = safeParseJson(text);
  if (data === undefined) {
    throw new ApiError(
      `fetchJson(${url}): unable to parse JSON`,
      {
        status,
        debugCtx: {
          text: text.slice(0, 100),
        },
      },
    );
  }

  return {
    data: deepFreezeIfDev(data),
    status,
  };
}
