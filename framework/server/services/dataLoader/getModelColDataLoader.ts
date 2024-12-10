import type DataLoader from 'dataloader';

import { IS_PROFILING_APIS } from 'config';
import createDataLoader from 'utils/createDataLoader';

export type ColVal = string | number | boolean | null | undefined;

const dataLoaders = new Map<
  ModelType,
  Map<string, DataLoader<
    ModelPartial<ModelClass>,
    ColVal
  >>
>();

export default function getModelColDataLoader<T extends ModelClass>(
  Model: T,
  col: ModelKey<T>,
): DataLoader<
  ModelPartial<T>,
  ColVal
> {
  const modelDataLoaders = TS.mapValOrSetDefault(dataLoaders, Model.type, new Map());
  if (!modelDataLoaders.has(col)) {
    modelDataLoaders.set(col, createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const startTime = performance.now();

        let query = modelQuery(Model);
        for (const partial of partials) {
          query = query.orWhere(partial);
        }
        const rows = await query;

        const results = partials.map(partial => {
          const pairs = TS.objEntries(partial);
          outer: for (const row of rows) {
            for (const pair of pairs) {
              if (row[pair[0]] !== pair[1]) {
                continue outer;
              }
            }
            return row[col];
          }
          return undefined;
        });

        if (IS_PROFILING_APIS) {
          // eslint-disable-next-line no-console
          console.log(`modelDataLoader(${Model.type}): ${results.length} ${plural('result', results.length)} in ${Math.round(performance.now() - startTime)}ms`);
        }

        return results as ColVal[];
      },
      {
        cacheKeyFn: key => Model.stringify(key),
        maxBatchSize: 1000,
      },
    ));
  }
  return modelDataLoaders.get(col) as DataLoader<
    ModelPartial<T>,
    ColVal
  >;
}
