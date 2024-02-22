import type DataLoader from 'dataloader';
import { IS_PROFILING_API } from 'consts/infra';

import createDataLoader from 'core/createDataLoader';
import stringify from 'utils/stringify';

type ModelIdsDataLoader = DataLoader<
  ModelPartial<ModelClass>,
  (number | string | (number | string)[])[]
>;

const dataLoaders = new Map<string, ObjectOf<ModelIdsDataLoader>>();

export default function getModelIdsDataLoader<T extends ModelClass>(
  Model: T,
): DataLoader<
  ModelPartial<T>,
  (number | string | (number | string)[])[]
> {
  const typeDataLoaders = TS.mapValOrSetDefault(dataLoaders, Model.type, Object.create(null));
  const primaryIndex = Model.getPrimaryIndex();
  const primaryIndexArr = Array.isArray(primaryIndex) ? primaryIndex : [primaryIndex];
  const indexStr = primaryIndexArr.join(',');
  if (!typeDataLoaders[indexStr]) {
    typeDataLoaders[indexStr] = createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const startTime = performance.now();

        const selectCols = new Set([
          ...primaryIndexArr,
          ...partials.flatMap(partial => Object.keys(partial)),
        ]);
        let query = modelQuery(Model).select([...selectCols]);
        for (const partial of partials) {
          query = query.orWhere(partial);
        }
        const rows = await query;

        const results = partials.map(partial => {
          const matchedRows = rows.filter(row => {
            for (const pair of TS.objEntries(partial)) {
              // @ts-ignore wontfix no overlap
              if (row[pair[0]] !== pair[1]) {
                return false;
              }
            }
            return true;
          });

          if (Array.isArray(primaryIndex)) {
            return matchedRows.map(row => primaryIndex.map(col => {
              if (!process.env.PRODUCTION
                && typeof row[col] !== 'number'
                && typeof row[col] !== 'string') {
                throw getErr(
                  `getModelIdsDataLoader(${Model.type}): ${col} isn't a number or string`,
                  {
                    val: row[col],
                    valType: typeof row[col],
                  },
                );
              }
              return row[col] as unknown as number | string;
            }));
          }
          return matchedRows.map(row => {
            if (!process.env.PRODUCTION
              && typeof row[primaryIndex] !== 'number'
              && typeof row[primaryIndex] !== 'string') {
              throw getErr(
                `getModelIdsDataLoader(${Model.type}): ${stringify(primaryIndex)} isn't a number or string`,
                {
                  val: row[primaryIndex],
                  valType: typeof row[primaryIndex],
                },
              );
            }
            return row[primaryIndex] as unknown as number | string;
          });
        });

        if (IS_PROFILING_API) {
          // eslint-disable-next-line no-console
          console.log(`modelIdsDataLoader(${Model.type}): ${results.length} ${pluralize('result', results.length)} in ${Math.round(performance.now() - startTime)}ms`);
        }

        return results;
      },
      {
        objKeys: true,
        maxBatchSize: 100,
      },
    );
  }
  return typeDataLoaders[indexStr] as DataLoader<
    ModelPartial<T>,
    (number | string | (number | string)[])[]
  >;
}
