import DataLoader from 'dataloader';

const dataLoaders: ObjectOf<DataLoader<
  ModelPartial<ModelClass>,
  Model | null
>> = Object.create(null);

export default function getModelDataLoader<T extends ModelClass>(Model: T): DataLoader<
  ModelPartial<T>,
  InstanceType<T> | null
> {
  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = new DataLoader(
      async (partials: readonly ModelPartial<T>[]) => {
        let query = Model.query();
        for (const partial of partials) {
          query = query.orWhere(partial);
        }
        const rows = await query;

        if (process.env.NODE_ENV !== 'production') {
          for (const row of rows) {
            row.$validate();
          }
        }

        return partials.map(
          partial => rows.find(row => {
            for (const [k, v] of TS.objEntries(partial)) {
              // @ts-ignore wontfix key error
              if (row[k] !== v) {
                return false;
              }
            }
            return true;
          }) ?? null,
        );
      },
      {
        maxBatchSize: 100,
        cache: false,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<ModelPartial<T>, InstanceType<T> | null>;
}
