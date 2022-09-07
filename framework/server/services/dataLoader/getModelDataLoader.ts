import type DataLoader from 'dataloader';

import createDataLoader from 'utils/createDataLoader';

const dataLoaders: ObjectOf<DataLoader<
  ModelPartial<ModelClass>,
  Model | null
>> = Object.create(null);

export default function getModelDataLoader<T extends ModelClass>(Model: T): DataLoader<
  ModelPartial<T>,
  ModelInstance<T> | null
> {
  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = createDataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        let query = modelQuery(Model);
        for (const partial of partials) {
          query = query.orWhere(builder => {
            for (const kv of TS.objEntries(partial)) {
              builder = kv[1] === null
                ? builder.whereNull(kv[0])
                : builder.where(kv[0] as string, kv[1] as any);
            }
            return builder;
          });
        }
        const rows = await query;

        if (!process.env.PRODUCTION) {
          for (const row of rows) {
            row.$validate();
          }
        }

        return partials.map(
          partial => rows.find(row => {
            for (const [k, v] of TS.objEntries(partial)) {
              // @ts-ignore wontfix no overlap
              if (row[k] !== v) {
                return false;
              }
            }
            return true;
          }) ?? null,
        );
      },
      {
        objKeys: true,
        maxBatchSize: 1000,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<ModelPartial<T>, ModelInstance<T> | null>;
}
