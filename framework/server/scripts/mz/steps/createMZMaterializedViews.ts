import knexMZ from 'services/knex/knexMZ';
import EntityModels from 'services/model/allEntityModels';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import verifyCreatedTables from '../helpers/verifyCreatedTables';

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
    let matches = s.match(/^(?:\w+\.)?\w+\s+as\s+(\w+)$/i);
    if (matches) {
      return matches[1];
    }

    matches = s.match(/^\w+\.(\w+)$/i);
    if (matches) {
      return matches[1];
    }

    return s;
  });

  const invalidSelect = selects.find(s => !/^\w+$/i.test(s));
  if (invalidSelect) {
    throw new Error(`validateQuery(${model.type}): invalid column "${invalidSelect}"`);
  }

  const duplicateCol = selects.find((s, idx) => selects.indexOf(s) !== idx);
  if (duplicateCol) {
    throw new Error(`validateQuery(${model.type}): duplicate column "${duplicateCol}"`);
  }

  for (const s of selects) {
    if (!TS.hasProp(model.getSchema(), s)) {
      throw new Error(`validateQuery(${model.type}): extra column "${s}"`);
    }
  }

  if (allSelects.length !== Object.keys(model.getSchema()).length) {
    const missingProps = Object.keys(model.getSchema())
      .filter(prop => !selects.includes(prop));
    throw new Error(`validateQuery(${model.type}): missing columns ${missingProps.join(', ')}`);
  }
}

// todo: mid/mid potentially reduce MZ memory usage by adding indexes
export default async function createMZMaterializedViews() {
  const createdViews = new Set<string>(EntityModels.map(model => model.tableName));

  const remainingModels = MaterializedViewModels.filter(
    model => !createdViews.has(model.tableName),
  );
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
        await knexMZ.raw(`
          CREATE VIEW "${model.tableName}"
          AS ${query.toKnexQuery().toString()}
        `);
        const primaryKey = model.getPrimaryKey();
        await knexMZ.raw(`
          CREATE INDEX "${model.tableName}_primary_idx"
          ON "${model.tableName}"
          (${primaryKey.map(col => `"${col}"`).join(', ')})
        `);

        createdViews.add(model.tableName);
      }

      remainingModels.splice(i, 1);
      i--;
    }

    if (remainingModels.length === startingLength) {
      throw new Error(`createMZMaterializedViews: circular or unknown dependency.`);
    }
  }

  await verifyCreatedTables(
    {
      host: process.env.MZ_HOST,
      port: TS.parseIntOrNull(process.env.MZ_PORT) ?? undefined,
      user: process.env.MZ_USER,
      password: process.env.MZ_PASS,
      database: process.env.MZ_DB,
    },
    knexMZ,
    MaterializedViewModels.filter(model => model.getReplicaTable() !== null),
  );
}
