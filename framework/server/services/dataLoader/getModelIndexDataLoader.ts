import DataLoader from 'dataloader';

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
  const indexArr = Array.isArray(index) ? index : [index];
  const indexStr = indexArr.join(',');
  if (!typeDataLoaders[indexStr]) {
    typeDataLoaders[indexStr] = new DataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        const selectCols = new Set([
          ...indexArr,
          ...partials.flatMap(partial => Object.keys(partial)),
        ]);
        let query = Model.query().select([...selectCols]);
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

          return matchedRows.map(row => indexArr.map(
            // @ts-ignore wontfix key error
            col => row[col],
          ));
        });
      },
      {
        maxBatchSize: 100,
        cache: false,
      },
    );
  }
  return typeDataLoaders[indexStr] as DataLoader<ModelPartial<T>, (string | number)[][]>;
}
