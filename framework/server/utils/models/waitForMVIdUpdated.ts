import type DataLoader from 'dataloader';
import { performance } from 'perf_hooks';
import fromPairs from 'lodash/fromPairs';

import createDataLoader from 'utils/createDataLoader';
import { HTTP_TIMEOUT } from 'settings';

const MAX_WAIT_TIME = HTTP_TIMEOUT / 2;
const WAIT_TIME = 250;

const dataLoaders: ObjectOf<DataLoader<[EntityId, number], Entity>> = Object.create(null);

function getDataLoader<T extends EntityClass>(
  Model: T,
): DataLoader<[EntityId, number], EntityInstance<T>> {
  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = createDataLoader(
      async (pairs: readonly [EntityId, number][]) => {
        const ents = await modelQuery(Model)
          .select('*')
          .where(builder => {
            builder = builder.whereRaw('0=1');
            for (const pair of pairs) {
              builder = builder.orWhere(builder2 => {
                void builder2.where({ id: pair[0] })
                  // todo: low/mid handle version overflow
                  .where('version', '>=', pair[1]);
              });
            }
          });
        const idToEnt = fromPairs(ents.map(ent => [ent.id, ent]));

        return pairs.map(pair => idToEnt[pair[0]] ?? null);
      },
      {
        objKeys: true,
        maxBatchSize: 1000,
        batchInterval: WAIT_TIME,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<[EntityId, number], EntityInstance<T>>;
}

export default async function waitForMVIdUpdated<T extends EntityClass>(
  Model: T,
  id: EntityId,
  version: number,
): Promise<EntityInstance<T>> {
  if (!id) {
    throw new Error(`waitForMVIdUpdated(${Model.type}): id is falsy.`);
  }
  if (!version) {
    throw new Error(`waitForMVIdUpdated(${Model.type}): version is falsy.`);
  }

  const startTime = performance.now();

  for (let i = 0; i < 100; i++) {
    // eslint-disable-next-line no-await-in-loop
    const ent = await getDataLoader(Model).load([id, version]);
    if (ent) {
      return ent;
    }

    if (performance.now() + WAIT_TIME - startTime >= MAX_WAIT_TIME) {
      throw new Error(`waitForMVIdUpdated(${Model.type}): timed out.`);
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(WAIT_TIME);
  }

  throw new Error(`waitForMVIdUpdated(${Model.type}): possible infinite loop.`);
}
