import type DataLoader from 'dataloader';
import { performance } from 'perf_hooks';

import createDataLoader from 'utils/createDataLoader';
import { HTTP_TIMEOUT } from 'settings';

const MAX_WAIT_TIME = HTTP_TIMEOUT / 2;
const WAIT_TIME = 250;

const dataLoaders: ObjectOf<DataLoader<EntityId, boolean>> = Object.create(null);

function getDataLoader<T extends EntityClass>(Model: T): DataLoader<EntityId, boolean> {
  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = createDataLoader(
      async (ids: readonly EntityId[]) => {
        const rows = await modelQuery(Model)
          .select('id')
          .whereIn('id', ids as EntityId[]);
        const selectedIdsSet = new Set(rows.map(
          r => r.id,
        ));

        return ids.map(id => selectedIdsSet.has(id));
      },
      {
        maxBatchSize: 1000,
        batchInterval: WAIT_TIME,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<EntityId, boolean>;
}

// todo: mid/mid improve waitForMVIdInserted by batching or streaming
export default async function waitForMVIdInserted<T extends EntityClass>(
  Model: T,
  id: EntityId,
) {
  if (!id) {
    throw new Error(`waitForMVIdInserted(${Model.type}): id is falsy.`);
  }

  const startTime = performance.now();

  for (let i = 0; i < 100; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await getDataLoader(Model).load(id)) {
      return;
    }

    if (performance.now() + WAIT_TIME - startTime >= MAX_WAIT_TIME) {
      throw new Error(`waitForMVIdInserted(${Model.type}): timed out.`);
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(WAIT_TIME);
  }

  throw new Error(`waitForMVIdInserted(${Model.type}): possible infinite loop.`);
}
