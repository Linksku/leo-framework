import type { BatchLoadFn, Options } from 'dataloader';
import DataLoader from 'dataloader';

export default function createDataLoader<K, V>(
  batchLoadFn: BatchLoadFn<K, V>,
  options: Omit<Options<K, V, string>, 'cache' | 'batchScheduleFn'> & {
    batchInterval?: number,
  } = {},
): DataLoader<K, V, string> {
  const dataLoader = new DataLoader<K, V, string>(
    keys => {
      if (!process.env.PRODUCTION && !options.cacheKeyFn
        && keys.some(k => k !== null && typeof k === 'object')) {
        throw new Error('createDataLoader: unexpected object key.');
      }

      dataLoader.clearAll();
      return batchLoadFn(keys);
    },
    {
      ...options,
      batchScheduleFn: cb => setTimeout(cb, options.batchInterval ?? 10),
    },
  );
  return dataLoader;
}
