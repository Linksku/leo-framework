import type DataLoader from 'dataloader';

import createDataLoader from 'utils/createDataLoader';

const dataLoaders: ObjectOf<ObjectOf<DataLoader<
  ModelPartial<ModelClass>,
  (number | string | (number | string)[])[]
>>> = Object.create(null);

export default function getModelIdsDataLoader<T extends ModelClass>(
  Model: T,
): DataLoader<
  ModelPartial<T>,
  (number | string | (number | string)[])[]
> {
  const typeDataLoaders = TS.objValOrSetDefault(dataLoaders, Model.type, Object.create(null));
  const primaryIndex = Model.getPrimaryIndex();
  const primaryIndexArr = Array.isArray(primaryIndex) ? primaryIndex : [primaryIndex];
  const indexStr = primaryIndexArr.join(',');
  if (!typeDataLoaders[indexStr]) {
    typeDataLoaders[indexStr] = createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const selectCols = new Set([
          ...primaryIndexArr,
          ...partials.flatMap(partial => Object.keys(partial)),
        ]);
        let query = modelQuery(Model).select([...selectCols]);
        for (const partial of partials) {
          query = query.orWhere(partial);
        }
        const rows = await query;

        return partials.map(partial => {
          const matchedRows = rows.filter(row => {
            for (const [k, v] of TS.objEntries(partial)) {
              // @ts-ignore wontfix no overlap
              if (row[k] !== v) {
                return false;
              }
            }
            return true;
          });

          if (Array.isArray(primaryIndex)) {
            return matchedRows.map(row => primaryIndex.map(col => {
              if (!process.env.PRODUCTION && typeof row[col] !== 'number' && typeof row[col] !== 'string') {
                throw new ErrorWithCtx(
                  `getModelIdsDataLoader(${Model.type}): ${col} isn't a number or string`,
                  `"${row[col]}" (${typeof row[col]})`,
                );
              }
              return row[col] as unknown as number | string;
            }));
          }
          return matchedRows.map(row => {
            if (!process.env.PRODUCTION && typeof row[primaryIndex] !== 'number' && typeof row[primaryIndex] !== 'string') {
              throw new ErrorWithCtx(
                `getModelIdsDataLoader(${Model.type}): ${primaryIndex} isn't a number or string`,
                `"${row[primaryIndex]}" (${typeof row[primaryIndex]})`,
              );
            }
            return row[primaryIndex] as unknown as number | string;
          });
        });
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
