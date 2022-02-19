import pg from 'pg';

import knexBT from 'services/knex/knexBT';
import knexMaterialize from 'services/knex/knexMaterialize';
import BTEntity, { BTEntityClass } from 'lib/Model/BTEntity';
import MVEntity, { MVEntityClass } from 'lib/Model/MVEntity';
import MVCache, { MVCacheClass } from 'lib/Model/MVCache';
import MVWithBTEntity, { MVWithBTEntityClass } from 'lib/Model/MVWithBTEntity';
import models from 'lib/Model/models';
import promiseTimeout from 'lib/promiseTimeout';

/*
wal_level = logical
wal_writer_delay = 10ms
*/

function getAllDeps(MVClasses: (MVEntityClass | MVCacheClass)[]): ModelClass[] {
  const allDeps = new Set<ModelClass>();
  const materializeTypes = new Set<ModelType>(
    MVClasses.map(m => m.type),
  );

  for (const model of MVClasses) {
    for (const dep of model.MVQueryDeps) {
      if (!materializeTypes.has(dep.type)) {
        if (!getModelClass(dep.type)) {
          throw new Error(`getAllDeps: dep "${dep}" not found.`);
        }

        allDeps.add(dep);
      }
    }
  }

  return [...allDeps];
}

async function recreateSource(BTDeps: BTEntityClass[]) {
  await knexMaterialize.raw('DROP SOURCE IF EXISTS mz_source CASCADE');
  await knexBT.raw('DROP PUBLICATION IF EXISTS mz_source');

  for (const dep of BTDeps) {
    await knexBT.raw('ALTER TABLE ?? REPLICA IDENTITY FULL', [dep.tableName]);
  }

  await knexBT.raw(
    `CREATE PUBLICATION mz_source FOR TABLE ${BTDeps.map(_ => '??').join(',')}`,
    BTDeps.map(dep => dep.tableName),
  );

  await knexMaterialize.raw(`
    CREATE MATERIALIZED SOURCE mz_source
    FROM POSTGRES
      CONNECTION 'host=${process.env.POSTGRES_HOST} port=${process.env.POSTGRES_PORT} user=${process.env.POSTGRES_USER} password=${process.env.POSTGRES_PASS} dbname=${process.env.POSTGRES_DB} sslmode=require'
      PUBLICATION 'mz_source';
  `);
}

async function createViews(BTDeps: BTEntityClass[], BTDepsWithSameMV: BTEntityClass[]) {
  const BTDepsWithoutSameMV = BTDeps.filter(dep => !BTDepsWithSameMV.includes(dep));
  await knexMaterialize.raw(
    `CREATE VIEWS FROM SOURCE mz_source (${[...BTDepsWithoutSameMV.map(_ => '??'), ...BTDepsWithSameMV.map(_ => '?? as ??')].join(',')})`,
    [
      ...BTDepsWithoutSameMV.map(dep => dep.tableName),
      ...BTDepsWithSameMV.flatMap(dep => [dep.tableName, dep.getMVModelClass().tableName]),
    ],
  );
}

function validateQuery(query: QueryBuilder<Model>, model: ModelClass) {
  const statements: {
    grouping: string,
    value: string | any[] | ObjectOf<any>,
    type?: string,
  }[] = (query.toKnexQuery() as any)._statements;
  const allSelects = statements
    // Only normal selects and aggregate selects
    .filter(s => s.grouping === 'columns' && (Object.keys(s).length === 2 || s.type === 'aggregate'))
    .flatMap(s => {
      if (typeof s.value === 'string') {
        return [s.value];
      }
      if (Array.isArray(s.value)) {
        return s.value;
      }
      return Object.keys(s.value);
    });
  if (!allSelects.length) {
    throw new Error(`validateQuery(${model.type}): select is required.`);
  }

  let selects: string[] = allSelects.filter(s => typeof s === 'string');
  selects = selects.map(s => {
    let matches = s.match(/^(?:[a-z]+\.)?[a-z]+\s+as\s+([a-z]+)$/i);
    if (matches) {
      return matches[1];
    }

    matches = s.match(/^[a-z]+\.([a-z]+)$/i);
    if (matches) {
      return matches[1];
    }

    return s;
  });

  const invalidSelect = selects.find(s => !/^[a-z]+$/i.test(s));
  if (invalidSelect) {
    throw new Error(`validateQuery(${model.type}): invalid column "${invalidSelect}"`);
  }

  const duplicateCol = selects.find((s, idx) => selects.indexOf(s) !== idx);
  if (duplicateCol) {
    throw new Error(`validateQuery(${model.type}): duplicate column "${duplicateCol}"`);
  }

  for (const s of selects) {
    if (!TS.hasProp(model.getSchema(), s)) {
      throw new Error(`validateQuery(${model.type}): unknown column "${s}"`);
    }
  }

  if (allSelects.length !== Object.keys(model.getSchema()).length) {
    const missingProps = Object.keys(model.getSchema())
      .filter(prop => !selects.includes(prop));
    throw new Error(`validateQuery(${model.type}): missing columns ${missingProps.join(', ')}`);
  }
}

async function checkCreatedMVs(MVClasses: (MVEntityClass | MVCacheClass)[]) {
  const client = new pg.Client({
    host: process.env.MATERIALIZE_HOST,
    port: TS.parseIntOrNull(process.env.MATERIALIZE_PORT) ?? undefined,
    user: process.env.MATERIALIZE_USER,
    password: process.env.MATERIALIZE_PASS,
    database: process.env.MATERIALIZE_DB,
  });
  await client.connect();

  const remainingModels = new Set(MVClasses);
  while (remainingModels.size) {
    await pause(1000);

    for (const model of remainingModels) {
      printDebug(`Verifying ${model.tableName}`, 'highlight');

      let result: pg.QueryResult<any>;
      try {
        result = await client.query(
          knexMaterialize(model.tableName).select('*').whereRaw('false').toString(),
        );
      } catch {
        continue;
      }
      const fields = result.fields.map(f => f.name);

      for (const f of fields) {
        if (!TS.hasProp(model.getSchema(), f)) {
          throw new Error(`checkCreatedMVs: unknown property ${model.tableName}.${f}`);
        }
      }

      for (const prop of Object.keys(model.getSchema())) {
        if (!fields.includes(prop)) {
          throw new Error(`checkCreatedMVs: missing column ${model.tableName}.${prop}`);
        }
      }

      remainingModels.delete(model);
    }
  }
}

export default async function createMVs() {
  const MVClasses = Object.values(models)
    .map(model => model.Model)
    .filter(
      model => model.prototype instanceof MVEntity || model.prototype instanceof MVCache,
    ) as (MVEntityClass | MVCacheClass)[];

  const allDeps = getAllDeps(MVClasses);
  const BTDeps = allDeps.filter(dep => dep.prototype instanceof BTEntity) as BTEntityClass[];
  const BTDepsWithSameMV = BTDeps.filter(
    dep => dep.getMVModelClass().prototype instanceof MVWithBTEntity
      && (dep.getMVModelClass() as MVWithBTEntityClass).sameAsBT,
  );

  await recreateSource(BTDeps);

  await createViews(BTDeps, BTDepsWithSameMV);
  const createdViews = new Set<string>([
    ...BTDeps.map(dep => dep.tableName),
    ...BTDepsWithSameMV.map(model => model.getMVModelClass().tableName),
  ]);

  const remainingModels = [...MVClasses.filter(model => !createdViews.has(model.tableName))];
  while (remainingModels.length) {
    const startingLength = remainingModels.length;
    outer: for (let i = 0; i < remainingModels.length; i++) {
      const model = remainingModels[i];

      if (!createdViews.has(model.tableName)) {
        for (const dep of model.MVQueryDeps) {
          if (!createdViews.has(dep.tableName)) {
            continue outer;
          }
        }

        printDebug(`Creating ${model.tableName}`, 'highlight');
        let query = model.MVQuery;
        if (model.extendMVQuery) {
          for (const fn of model.extendMVQuery) {
            query = fn(query);
          }
        }

        validateQuery(query, model);
        await knexMaterialize.raw(
          `CREATE MATERIALIZED VIEW ?? AS ${query.toKnexQuery().toString()}`,
          [model.tableName],
        );

        createdViews.add(model.tableName);
      }

      remainingModels.splice(i, 1);
      i--;
    }

    if (remainingModels.length === startingLength) {
      throw new Error(`createMVs: circular or unknown dependency.`);
    }
  }

  await promiseTimeout(
    checkCreatedMVs(MVClasses),
    60 * 1000,
    new Error('createMVs: checkCreatedMVs timed out.'),
  );
}
