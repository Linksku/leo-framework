import allModels from 'services/model/allModels';

// Warm PG and AJV caches
export default async function fetchEachModelOnce() {
  const results = await Promise.all(
    allModels
      .filter(m => m.Model.getReplicaTable())
      .map(async m => {
        try {
          return await modelQuery(m.Model).limit(1);
        } catch {
          return null;
        }
      }),
  );
  TS.filterNulls(results.flat())
    .map(ent => ent.$validate());
}
