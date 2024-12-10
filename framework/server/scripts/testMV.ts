import round from 'lodash/round.js';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';
import waitForQueryReady from 'utils/models/waitForQueryReady';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import deleteTopicsAndSchema from 'utils/infra/deleteTopicsAndSchema';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import deleteRRSubscription from 'utils/infra/deleteRRSubscription';
import createBTReplicationSlot from 'utils/infra/createBTReplicationSlot';
import {
  BT_PUB_MODEL_PREFIX,
  BT_SLOT_RR_PREFIX,
  MZ_SOURCE_PG_PREFIX,
  MZ_TIMESTAMP_FREQUENCY,
  MZ_SINK_PREFIX,
  MZ_SINK_CONNECTOR_PREFIX,
  MZ_SINK_TOPIC_PREFIX,
  RR_SUB_PREFIX,
  BT_REPLICA_IDENTITY_FOR_MZ,
} from 'consts/mz';
import {
  PG_BT_HOST,
  PG_BT_PORT,
  PG_BT_DB,
  INTERNAL_DOCKER_HOST,
} from 'consts/infra';
import randInt from 'utils/randInt';
import getChance from 'services/getChance';
import createMZSink from './mv/helpers/createMZSink';
import createMZSinkConnector from './mv/helpers/createMZSinkConnector';

type TestRow = {
  id: number,
  unindexed: number,
  name: string,
};

const MIN_ROWS = 100_000;

async function destroyTestInfra() {
  await Promise.all([
    (async () => {
      try {
        const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
        for (const connector of connectors) {
          if (connector.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}__testMV___`)) {
            await deleteKafkaConnector(connector);
          }
        }
        await knexMZ.raw(`DROP SINK IF EXISTS "${MZ_SINK_PREFIX}__testMV__"`);
        await deleteTopicsAndSchema(`${MZ_SINK_TOPIC_PREFIX}__testMV__`);
        await knexMZ.raw(`DROP SOURCE IF EXISTS ${MZ_SOURCE_PG_PREFIX}test CASCADE`);
      } catch (err: any) {
        printDebug(err, 'warn');
      }
    })(),
    (async () => {
      try {
        await deleteRRSubscription(`${RR_SUB_PREFIX}test`);
        await deleteBTReplicationSlot(`${BT_SLOT_RR_PREFIX}test`);
        await knexRR.raw('TRUNCATE __test__');
      } catch (err: any) {
        printDebug(err, 'warn');
      }
    })(),
  ]);
  await knexBT.raw(`DROP PUBLICATION IF EXISTS ${BT_PUB_MODEL_PREFIX}test`);
}

async function getRandomRow() {
  const chance = await getChance();
  return {
    unindexed: Math.round(Math.random() * 1_000_000),
    name: chance.first(),
  };
}

type QueryTimes = {
  bt: number,
  rr: number,
  mzMv: number,
  rrMv: number,
};

async function insert1RowTimes() {
  const startTime = performance.now();
  const times: Partial<QueryTimes> = {};
  const rowData = await getRandomRow();
  const [insertedRow2] = await knexBT<TestRow>('__test__')
    .insert(rowData)
    .returning('id');
  times.bt = performance.now() - startTime;
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__test__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rr = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ<TestRow>('__testMV__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.mzMv = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__testMV__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rrMv = performance.now() - startTime;
    })(),
  ]);
  return times as QueryTimes;
}

async function update1RowTimes(id: number) {
  const update = await getRandomRow();
  const startTime = performance.now();
  const times: Partial<QueryTimes> = {};
  await knexBT<TestRow>('__test__')
    .update(update)
    .where({ id });
  times.bt = performance.now() - startTime;
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__test__').where({
          id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rr = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ<TestRow>('__testMV__').where({
          id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.mzMv = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__testMV__').where({
          id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rrMv = performance.now() - startTime;
    })(),
  ]);
  return times as QueryTimes;
}

async function insert1000RowsTimes() {
  const rows = Array.from({ length: 1000 }, _ => getRandomRow());
  const startTime = performance.now();
  const times: Partial<QueryTimes> = {};
  const insertedRows = await knexBT
    .batchInsert(
      '__test__',
      rows,
    )
    .returning(
      // @ts-expect-error Knex has wrong type
      'id',
    );
  const lastRow = TS.defined(insertedRows.at(-1));
  times.bt = performance.now() - startTime;
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__test__').where({
          // @ts-expect-error Knex has wrong type
          id: lastRow.id,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rr = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ<TestRow>('__testMV__').where({
          // @ts-expect-error Knex has wrong type
          id: lastRow.id,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.mzMv = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__testMV__').where({
          // @ts-expect-error Knex has wrong type
          id: lastRow.id,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rrMv = performance.now() - startTime;
    })(),
  ]);
  return times as QueryTimes;
}

async function update1000RowsTimes(lastId: number) {
  const updates = await Promise.all(Array.from(
    { length: 1000 },
    () => getRandomRow().then(rowData => ({
      id: randInt(1, lastId),
      ...rowData,
    })),
  ));
  const startTime = performance.now();
  const times: Partial<QueryTimes> = {};

  const cols = TS.literal(['id', 'unindexed', 'name'] as const);
  await knexBT.raw(
    `
      UPDATE __test__
      SET unindexed = CAST(t.unindexed AS INTEGER),
        name = t.name
      FROM (VALUES ${
        updates.map(_ => `(${cols.map(_ => '?').join(',')})`).join(',')
      })
      t(${cols.join(',')})
      WHERE __test__.id = CAST(t.id AS INTEGER)
    `,
    updates.flatMap(obj => cols.map(k => obj[k])),
  );

  times.bt = performance.now() - startTime;
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__test__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rr = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ<TestRow>('__testMV__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.mzMv = performance.now() - startTime;
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR<TestRow>('__testMV__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, maxWaitTime: 20 * 1000, exponentialBackoff: false },
      );
      times.rrMv = performance.now() - startTime;
    })(),
  ]);
  return times as QueryTimes;
}

async function getMedianTimes(getTimes: () => Promise<QueryTimes>, repeat = 3) {
  const timesArr: QueryTimes[] = [];
  for (let i = 0; i < repeat; i++) {
    timesArr.push(await getTimes());
  }
  const medianTimes: Partial<QueryTimes> = {};
  for (const k of TS.objKeys(timesArr[0])) {
    const times = timesArr.map(t => t[k]);
    times.sort((a, b) => a - b);
    medianTimes[k] = times[Math.floor(times.length / 2)];
  }
  return medianTimes as QueryTimes;
}

/*
Learnings:
- MZ reads are slow, especially with sorting
- Debezium snapshot is slow
- Replication is slow if RR has no primary key
*/
export default async function testMV() {
  console.log('Destroying test MZ');
  await destroyTestInfra();

  const rows = await knexBT<TestRow>('__test__').count({ count: '*' });
  let btCount = rows[0].count as number;

  const numRowsToInsert = btCount < MIN_ROWS ? MIN_ROWS - btCount : 0;
  if (numRowsToInsert) {
    console.log(`Inserting ${numRowsToInsert} rows`);
    await knexBT.batchInsert(
      '__test__',
      Array.from({ length: numRowsToInsert }, _ => getRandomRow()),
      1000,
    );
    btCount += numRowsToInsert;
  }

  let startTime = performance.now();
  console.log('Creating publication');
  await knexBT.raw(`ALTER TABLE __test__ REPLICA IDENTITY ${BT_REPLICA_IDENTITY_FOR_MZ}`);
  await knexBT.raw(`CREATE PUBLICATION ${BT_PUB_MODEL_PREFIX}test FOR TABLE __test__`);

  await Promise.all([
    (async () => {
      console.log('Initializing MZ');
      await knexMZ.raw(`
        CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_PREFIX}test"
        FROM POSTGRES
          CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${PG_BT_DB} sslmode=require'
          PUBLICATION '${BT_PUB_MODEL_PREFIX}test'
        WITH (
          timestamp_frequency_ms = ${MZ_TIMESTAMP_FREQUENCY}
        );
      `);
      await knexMZ.raw(`CREATE VIEWS FROM SOURCE "${MZ_SOURCE_PG_PREFIX}test" (__test__)`);
      // await knexMZ.raw(`CREATE INDEX "__test___pkey" ON "__test__" (id)`);
      await knexMZ.raw(
        'CREATE MATERIALIZED VIEW "__testMV__" AS select id, unindexed from __test__;',
      );

      console.log('Initializing Kafka sinks');
      await createMZSink({
        modelType: '__testMV__',
        primaryKey: ['id'],
      });
      await createMZSinkConnector({
        name: '__testMV__',
        replicaTable: '__testMV__',
        primaryKey: ['id'],
      });
    })(),
    (async () => {
      console.log('Initializing replica');
      await createBTReplicationSlot(`${BT_SLOT_RR_PREFIX}test`);
      await knexRR.raw(`
        CREATE SUBSCRIPTION "${RR_SUB_PREFIX}test"
        CONNECTION 'host=${PG_BT_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${PG_BT_DB}'
        PUBLICATION "${BT_PUB_MODEL_PREFIX}test"
        WITH (
          create_slot = false,
          slot_name = '${BT_SLOT_RR_PREFIX}test'
        )
      `);
    })(),
  ]);
  console.log(`Initialized in ${round(performance.now() - startTime, 1)}ms`);

  let times = await insert1RowTimes();
  btCount++;
  console.log(`RR initialized in ${round(times.rr, 1)}ms`);
  console.log(`MZ initialized in ${round(times.mzMv, 1)}ms`);
  console.log(`RR MV initialized in ${round(times.rrMv, 1)}ms`);
  console.log('');

  startTime = performance.now();
  await knexMZ<TestRow>('__test__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MZ row by primary key in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexRR<TestRow>('__testMV__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 RR row by primary key in ${round(performance.now() - startTime, 1)}ms`, '\n');

  times = await getMedianTimes(insert1RowTimes);
  btCount++;
  console.log(`Inserted 1 BT row in ${round(times.bt, 1)}ms`);
  console.log(`Inserted 1 RR row in ${round(times.rr, 1)}ms`);
  console.log(`Inserted 1 MZ MV row in ${round(times.mzMv, 1)}ms`);
  console.log(`Inserted 1 RR MV row in ${round(times.rrMv, 1)}ms`);
  console.log('');

  times = await getMedianTimes(() => update1RowTimes(btCount));
  console.log(`Updated 1 BT row in ${round(times.bt, 1)}ms`);
  console.log(`Updated 1 RR row in ${round(times.rr, 1)}ms`);
  console.log(`Updated 1 MZ MV row in ${round(times.mzMv, 1)}ms`);
  console.log(`Updated 1 RR MV row in ${round(times.rrMv, 1)}ms`);
  console.log('');

  times = await getMedianTimes(insert1000RowsTimes);
  btCount += 1000;
  console.log(`Inserted 1000 BT rows in ${round(times.bt, 1)}ms`);
  console.log(`Inserted 1000 RR rows in ${round(times.rr, 1)}ms`);
  console.log(`Inserted 1000 MZ MV rows in ${round(times.mzMv, 1)}ms`);
  console.log(`Inserted 1000 RR MV rows in ${round(times.rrMv, 1)}ms`);
  console.log('');

  times = await getMedianTimes(() => update1000RowsTimes(btCount));
  console.log(`Updated 1000 BT rows in ${round(times.bt, 1)}ms`);
  console.log(`Updated 1000 RR rows in ${round(times.rr, 1)}ms`);
  console.log(`Updated 1000 MZ MV rows in ${round(times.mzMv, 1)}ms`);
  console.log(`Updated 1000 RR MV rows in ${round(times.rrMv, 1)}ms`);
  console.log('');

  await destroyTestInfra();
}
