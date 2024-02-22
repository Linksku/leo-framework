import type DataLoader from 'dataloader';

import { IS_PROFILING_API } from 'consts/infra';
import createDataLoader from 'core/createDataLoader';

const dataLoaders = new Map<string, DataLoader<
  ModelPartial<ModelClass>,
  Model | null
>>();

export default function getModelDataLoader<T extends ModelClass>(Model: T): DataLoader<
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

        if (!process.env.PRODUCTION && !IS_PROFILING_API) {
          for (const row of rows) {
            row.$validate();
          }
        }

        const results = partials.map(partial => {
          const pairs = TS.objEntries(partial);
          return rows.find(row => {
            for (const pair of pairs) {
              // @ts-ignore wontfix no overlap
              if (row[pair[0]] !== pair[1]) {
                return false;
              }
            }
            return true;
          }) ?? null;
        });

        if (IS_PROFILING_API) {
          // eslint-disable-next-line no-console
          console.log(`modelDataLoader(${Model.type}): ${results.length} ${pluralize('result', results.length)} in ${Math.round(performance.now() - startTime)}ms`);
        }

        return results;
      },
      {
        objKeys: true,
        maxBatchSize: 1000,
      },
    ));
  }
  return dataLoaders.get(Model.type) as DataLoader<ModelPartial<T>, ModelInstance<T> | null>;
}
