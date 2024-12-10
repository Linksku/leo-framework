import type DataLoader from 'dataloader';

import { IS_PROFILING_APIS } from 'config';
import createDataLoader from 'utils/createDataLoader';

const dataLoaders = new Map<ModelType, DataLoader<
  ModelPartial<ModelClass>,
  Model | null
>>();

export default function getModelDataLoader<T extends ModelClass>(
  Model: T,
): DataLoader<
  ModelPartial<T>,
  ModelInstance<T> | null
> {
  if (!dataLoaders.has(Model.type)) {
    dataLoaders.set(Model.type, createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const startTime = performance.now();

        let query = modelQuery(Model);
        for (const partial of partials) {
          query = query.orWhere(partial);
        }
        const rows = await query;

        if (!process.env.PRODUCTION && !IS_PROFILING_APIS) {
          for (const row of rows) {
            row.$validate();
          }
        }

        const results = partials.map(partial => {
          const pairs = TS.objEntries(partial);
          outer: for (const row of rows) {
            for (const pair of pairs) {
              if (row[pair[0]] !== pair[1]) {
                continue outer;
              }
            }
            return row;
          }
          return null;
        });

        if (IS_PROFILING_APIS) {
          // eslint-disable-next-line no-console
          console.log(`modelDataLoader(${Model.type}): ${results.length} ${plural('result', results.length)} in ${Math.round(performance.now() - startTime)}ms`);
        }

        return results;
      },
      {
        cacheKeyFn: key => Model.stringify(key),
        maxBatchSize: 1000,
      },
    ));
  }
  return dataLoaders.get(Model.type) as DataLoader<ModelPartial<T>, ModelInstance<T> | null>;
}
