import getUrlParams from 'utils/getUrlParams';
import stringifyUrlQuery from 'utils/stringifyUrlQuery';

export type { NavState } from './historyStoreTypes';

export const MAX_BACK_STATES = 5;

export const MAX_FORWARD_STATES = 5;

export function queryStrToQuery(queryStr: string): Stable<ObjectOf<string | number>> {
  const params = getUrlParams(queryStr);
  const newQuery: ObjectOf<string | number> = Object.create(null);
  for (const pair of params.entries()) {
    newQuery[pair[0]] = pair[1];
  }
  return newQuery as Stable<ObjectOf<string | number>>;
}

function getPath(path: string, queryStr: string | null, hash: string | null): string {
  let newPath = path;
  if (queryStr) {
    newPath += `?${queryStr}`;
  }
  if (hash) {
    newPath += `#${hash}`;
  }
  return newPath;
}

export function getFullPath(
  path: string,
  queryStr: string | null,
  hash: string | null,
): string {
  return window.location.origin + getPath(path, queryStr, hash);
}

export function getPathFromState(state: HistoryState): string {
  return getPath(state.path, state.queryStr, state.hash);
}

export function getFullPathFromState(state: HistoryState): string {
  return getFullPath(state.path, state.queryStr, state.hash);
}

export function getPartsFromPath(
  rawPath: string,
  query: ObjectOf<string | number> | null = null,
  rawHash: string | null = null,
): {
  path: string,
  query: ObjectOf<string | number> | null,
  queryStr: string | null,
  hash: string | null,
} {
  const questionIdx = rawPath.indexOf('?');
  const hashIdx = rawPath.indexOf('#');
  const path = rawPath.slice(
    0,
    Math.min(
      questionIdx >= 0 ? questionIdx : Number.POSITIVE_INFINITY,
      hashIdx >= 0 ? hashIdx : Number.POSITIVE_INFINITY,
    ),
  );

  if (!process.env.PRODUCTION && (
    (query && questionIdx >= 0)
    || (rawHash && hashIdx >= 0)
  )) {
    throw new Error(`getPartsFromPath(${rawPath}): don't include query/hash in path`);
  }

  let queryStr: string | null = null;
  if (query) {
    queryStr = stringifyUrlQuery(query);
  } else if (questionIdx >= 0) {
    if (hashIdx < 0) {
      queryStr = rawPath.slice(questionIdx + 1);
      query = queryStrToQuery(queryStr);
    } else if (questionIdx < hashIdx) {
      queryStr = rawPath.slice(questionIdx + 1, hashIdx);
      query = queryStrToQuery(queryStr);
    }
  }
  const hash = rawHash
    ?? (hashIdx >= 0 ? rawPath.slice(hashIdx + 1) : null);

  return {
    path,
    query,
    queryStr,
    hash,
  };
}
