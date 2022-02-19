import Chance from 'chance';
import { performance } from 'perf_hooks';
import round from 'lodash/round';

import knexBT from 'services/knex/knexBT';
import knexMaterialize from 'services/knex/knexMaterialize';
import waitForQueryReady from 'lib/modelUtils/waitForQueryReady';

const chance = new Chance();

const MIN_ROWS = 1_000_000;

function getRandomRow() {
  return {
    unindexed: Math.round(Math.random() * 1_000_000),
    name: chance.first(),
  };
}

async function bulkUpdate(objs: any[]) {
  const cols = ['id', 'unindexed', 'name'];
  await knexBT.raw(
    `
      UPDATE __test__
      SET unindexed = CAST(t.unindexed AS INTEGER),
        name = t.name
      FROM (VALUES ${
        objs.map(_ => `(${cols.map(_ => '?').join(',')})`).join(',')
      })
      t(${cols.join(',')})
      WHERE __test__.id = CAST(t.id AS INTEGER)
    `,
    objs.flatMap(obj => cols.map(k => obj[k])),
  );
}

export default async function testMV() {
  let rows = await knexBT('__test__').count({ count: '*' });
  let btCount = rows[0].count as number;

  if (btCount < MIN_ROWS) {
    await knexBT.batchInsert(
      '__test__',
      Array.from({ length: MIN_ROWS - btCount }).map(_ => getRandomRow()),
      1000,
    );
    rows = await knexBT('__test__').count({ count: '*' });
    btCount = rows[0].count as number;
  }

  await knexMaterialize.raw('DROP SOURCE IF EXISTS mz_source_test CASCADE');
  await knexBT.raw('DROP PUBLICATION IF EXISTS mz_source_test');
  await knexBT.raw('ALTER TABLE __test__ REPLICA IDENTITY FULL');
  await knexBT.raw(`CREATE PUBLICATION mz_source_test FOR TABLE __test__`);
  await knexMaterialize.raw(`
    CREATE MATERIALIZED SOURCE mz_source_test
    FROM POSTGRES
      CONNECTION 'host=${process.env.POSTGRES_HOST} port=${process.env.POSTGRES_PORT} user=${process.env.POSTGRES_USER} password=${process.env.POSTGRES_PASS} dbname=${process.env.POSTGRES_DB} sslmode=require'
      PUBLICATION 'mz_source_test';
  `);
  await knexMaterialize.raw('CREATE VIEWS FROM SOURCE mz_source_test (__test__)');

  let startTime = performance.now();
  await knexMaterialize.raw(
    `CREATE MATERIALIZED VIEW "__testMV__" AS select id, unindexed, name from __test__;`,
  );

  await waitForQueryReady(
    knexMaterialize('__testMV__'),
    { minWaitTime: 100, maxWaitTime: 5 * 60 * 1000, exponentialBackoff: false },
  );
  console.log(`MVs created in ${round(performance.now() - startTime, 1)}ms`, '\n');
  await knexMaterialize.raw('CREATE INDEX "__testMV_idx_id__" ON "__testMV__" (id)');
  await knexMaterialize.raw('CREATE INDEX "__testMV_idx_multi__" ON "__testMV__" (id, unindexed)');
  await knexMaterialize.raw('CREATE INDEX "__testMV_idx_name__" ON "__testMV__" (name)');
  await waitForQueryReady(
    knexMaterialize('__testMV__'),
    { minWaitTime: 100, exponentialBackoff: false },
  );

  startTime = performance.now();
  await knexBT('__test__').where({ unindexed: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row without index in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').where({ unindexed: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row without index in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  await knexBT('__test__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row by primary key in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row by primary key in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  await knexBT('__test__').where({ id: 123_456, unindexed: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row by multi-column index in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').where({ id: 123_456, unindexed: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row by multi-column index in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  await knexBT('__test__').where('id', '>', 500_000).limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row by range index in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').where('id', '>', 500_000).limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row by range index in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  await knexBT('__test__').where({ name: 'Leo' }).limit(1, { skipBinding: true });
  await knexBT('__test__').where({ name: 'non-existent' }).limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row by text index in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').where({ name: 'Leo' }).limit(1, { skipBinding: true });
  await knexMaterialize('__testMV__').where({ name: 'non-existent' }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row by text index in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  await knexBT('__test__').orderBy('id', 'asc').limit(1, { skipBinding: true });
  console.log(`Selected 1 BT row ordered by primary key in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexMaterialize('__testMV__').orderBy('id', 'asc').limit(1, { skipBinding: true });
  console.log(`Selected 1 MV row ordered by primary key in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  const [insertedRow] = await knexBT('__test__')
    .insert(getRandomRow())
    .returning('id');
  btCount++;
  console.log(`Inserted 1 BT row in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await waitForQueryReady(
    knexMaterialize('__testMV__').where({ id: insertedRow.id }),
    { minWaitTime: 10, exponentialBackoff: false },
  );
  console.log(`Inserted 1 MV row in ${round(performance.now() - startTime, 1)}ms`, '\n');

  const updateId = Math.ceil(btCount * Math.random());
  const update = getRandomRow();
  startTime = performance.now();
  await knexBT('__test__')
    .update(update)
    .where({
      id: updateId,
    });
  console.log(`Updated 1 BT row in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await waitForQueryReady(
    knexMaterialize('__testMV__').where({
      id: updateId,
      unindexed: update.unindexed,
    }),
    { minWaitTime: 10, exponentialBackoff: false },
  );
  console.log(`Updated 1 MV row in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  const [insertedRow2] = await knexBT
    .batchInsert(
      '__test__',
      Array.from({ length: 1000 }).map(_ => getRandomRow()),
    )
    .returning(
      // @ts-ignore Knex has wrong type
      'id',
    );
  btCount += 1000;
  console.log(`Inserted 1000 BT rows in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await waitForQueryReady(
    knexMaterialize('__testMV__').where({
      // @ts-ignore Knex has wrong type
      id: insertedRow2.id,
    }),
    { minWaitTime: 10, exponentialBackoff: false },
  );
  console.log(`Inserted 1000 MV rows in ${round(performance.now() - startTime, 1)}ms`, '\n');

  const updates = Array.from({ length: 1000 }).map(_ => ({
    id: Math.ceil(btCount * Math.random()),
    ...getRandomRow(),
  }));
  startTime = performance.now();
  await bulkUpdate(updates);
  console.log(`Updated 1000 BT rows in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await waitForQueryReady(
    knexMaterialize('__testMV__').where({
      id: updates[0].id,
      unindexed: updates[0].unindexed,
    }),
    { minWaitTime: 10, exponentialBackoff: false },
  );
  console.log(`Updated 1000 MV rows in ${round(performance.now() - startTime, 1)}ms`, '\n');
}
