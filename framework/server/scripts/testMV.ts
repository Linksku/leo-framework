import Chance from 'chance';
import round from 'lodash/round.js';

import knexBT from 'services/knex/knexBT';
import knexMZ from 'services/knex/knexMZ';
import knexRR from 'services/knex/knexRR';
import waitForQueryReady from 'utils/models/waitForQueryReady';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import deleteKafkaTopics from 'utils/infra/deleteKafkaTopics';
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
} from 'consts/mz';
import { PG_BT_HOST, PG_BT_PORT, INTERNAL_DOCKER_HOST } from 'consts/infra';
import deleteSchemaRegistry from 'utils/infra/deleteSchemaRegistry';
import createMZSink from './mv/helpers/createMZSink';
import createMZSinkConnector from './mv/helpers/createMZSinkConnector';

const chance = new Chance();

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
        await deleteKafkaTopics(`${MZ_SINK_TOPIC_PREFIX}__testMV__`);
        await deleteSchemaRegistry(new RegExp(`^${MZ_SINK_TOPIC_PREFIX}__testMV__-(key|value)$`));
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

/*
Learnings:
- MZ reads are slow, especially with sorting
- Debezium snapshot is slow
- Replication is slow if RR has no primary key
*/
export default async function testMV() {
  console.log('Destroying test MZ');
  await destroyTestInfra();

  const rows = await knexBT('__test__').count({ count: '*' });
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

  console.log('Creating publication');
  await knexBT.raw('ALTER TABLE __test__ REPLICA IDENTITY FULL');
  await knexBT.raw(`CREATE PUBLICATION ${BT_PUB_MODEL_PREFIX}test FOR TABLE __test__`);

  let startTime = performance.now();
  await Promise.all([
    (async () => {
      console.log('Initializing MZ');
      await knexMZ.raw(`
        CREATE MATERIALIZED SOURCE "${MZ_SOURCE_PG_PREFIX}test"
        FROM POSTGRES
          CONNECTION 'host=${INTERNAL_DOCKER_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB} sslmode=require'
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
        CONNECTION 'host=${PG_BT_HOST} port=${PG_BT_PORT} user=${process.env.PG_BT_USER} password=${process.env.PG_BT_PASS} dbname=${process.env.PG_BT_DB}'
        PUBLICATION "${BT_PUB_MODEL_PREFIX}test"
        WITH (
          create_slot = false,
          slot_name = '${BT_SLOT_RR_PREFIX}test'
        )
      `);
    })(),
  ]);

  const [insertedRow] = await knexBT('__test__')
    .insert(getRandomRow())
    .returning('id');
  btCount++;

  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR('__test__').where({ id: insertedRow.id }),
        { minWaitTime: 100, maxWaitTime: 5 * 60 * 1000, exponentialBackoff: false },
      );
      console.log(`RR initialized in ${round((performance.now() - startTime) / 1000, 1)}s`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ('__testMV__').where({ id: insertedRow.id }),
        { minWaitTime: 100, maxWaitTime: 5 * 60 * 1000, exponentialBackoff: false },
      );
      console.log(`MZ initialized in ${round((performance.now() - startTime) / 1000, 1)}s`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR('__testMV__').where({ id: insertedRow.id }),
        { minWaitTime: 100, maxWaitTime: 5 * 60 * 1000, exponentialBackoff: false },
      );
      console.log(`RR MV initialized in ${round((performance.now() - startTime) / 1000, 1)}s`);
    })(),
  ]);
  console.log('');

  startTime = performance.now();
  await knexMZ('__test__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 MZ row by primary key in ${round(performance.now() - startTime, 1)}ms`);
  startTime = performance.now();
  await knexRR('__testMV__').where({ id: 123_456 }).limit(1, { skipBinding: true });
  console.log(`Selected 1 RR row by primary key in ${round(performance.now() - startTime, 1)}ms`, '\n');

  startTime = performance.now();
  const [insertedRow2] = await knexBT('__test__')
    .insert(getRandomRow())
    .returning('id');
  btCount++;
  console.log(`Inserted 1 BT row in ${round(performance.now() - startTime, 1)}ms`);
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR('__test__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1 RR row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ('__testMV__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1 MZ MV row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR('__testMV__').where({ id: insertedRow2.id }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1 RR MV row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
  ]);
  console.log('');

  const update = getRandomRow();
  startTime = performance.now();
  await knexBT('__test__')
    .update(update)
    .where({
      id: insertedRow2.id,
    });
  console.log(`Updated 1 BT row in ${round(performance.now() - startTime, 1)}ms`);
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR('__test__').where({
          id: insertedRow2.id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1 RR row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ('__testMV__').where({
          id: insertedRow2.id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1 MZ MV row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR('__testMV__').where({
          id: insertedRow2.id,
          unindexed: update.unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1 RR MV row in ${round(performance.now() - startTime, 1)}ms`);
    })(),
  ]);
  console.log('');

  startTime = performance.now();
  const insertedRows = await knexBT
    .batchInsert(
      '__test__',
      Array.from({ length: 1000 }, _ => getRandomRow()),
    )
    .returning(
      // @ts-ignore Knex has wrong type
      'id',
    );
  btCount += insertedRows.length;
  const insertedRow3 = insertedRows.at(-1);
  console.log(`Inserted 1000 BT rows in ${round(performance.now() - startTime, 1)}ms`);
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR('__test__').where({
          // @ts-ignore Knex has wrong type
          id: insertedRow3.id,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1000 RR rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ('__testMV__').where({
          // @ts-ignore Knex has wrong type
          id: insertedRow3.id,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1000 MZ MV rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR('__testMV__').where({
          // @ts-ignore Knex has wrong type
          id: insertedRow3.id,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Inserted 1000 RR MV rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
  ]);
  console.log('');

  const updates = Array.from({ length: 1000 }, _ => ({
    id: Math.ceil(btCount * Math.random()),
    ...getRandomRow(),
  }));
  startTime = performance.now();
  await bulkUpdate(updates);
  console.log(`Updated 1000 BT rows in ${round(performance.now() - startTime, 1)}ms`);
  await Promise.all([
    (async () => {
      await waitForQueryReady(
        knexRR('__test__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1000 RR rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexMZ('__testMV__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1000 MZ MV rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
    (async () => {
      await waitForQueryReady(
        knexRR('__testMV__').where({
          id: updates[0].id,
          unindexed: updates[0].unindexed,
        }),
        { minWaitTime: 10, exponentialBackoff: false },
      );
      console.log(`Updated 1000 RR MV rows in ${round(performance.now() - startTime, 1)}ms`);
    })(),
  ]);
  console.log('');

  await destroyTestInfra();
}
