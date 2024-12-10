import allModels from 'core/models/allModels';

// Warm PG and AJV caches
export default async function fetchEachModelOnce() {
  await Promise.all(
    allModels
      .filter(m => m.Model.getReplicaTable())
      .map(async ({ Model }) => {
        let instance: Model | undefined;
        try {
          const results = await modelQuery(Model).limit(1);
          instance = results[0];
        } catch {}

        if (!instance) {
          return;
        }

        // If this fails, it's likely an incomplete migration
        instance.$validate();

        Model.stringify(instance.$toCachePojo());
      }),
  );
}
