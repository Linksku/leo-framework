import type DataLoader from 'dataloader';

import createDataLoader from 'utils/createDataLoader';

const dataLoaders: ObjectOf<ObjectOf<DataLoader<
  ModelPartial<ModelClass>,
  (string | number)[][]
>>> = Object.create(null);

export default function getModelIdsDataLoader<T extends ModelClass>(
  Model: T,
  index: ModelIndex<T>,
): DataLoader<
  ModelPartial<T>,
  (string | number)[][]
> {
  const typeDataLoaders = TS.objValOrSetDefault(dataLoaders, Model.type, Object.create(null));
  const indexStr = index.join(',');
  if (!typeDataLoaders[indexStr]) {
    typeDataLoaders[indexStr] = createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const selectCols = new Set([
          ...index,
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
              // @ts-ignore wontfix key error
              if (row[k] !== v) {
                return false;
              }
            }
            return true;
          });

          return matchedRows.map(row => index.map(
            col => row[col] as unknown as string | number,
          ));
        });
      },
      {
        objKeys: true,
        maxBatchSize: 100,
      },
    );
  }
  return typeDataLoaders[indexStr] as DataLoader<ModelPartial<T>, (string | number)[][]>;
}
