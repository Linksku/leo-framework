import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';
import isColDescNullsLast from 'utils/models/isColDescNullsLast';
import validateTableCols from './validateTableCols';

export default async function createIndex({
  db,
  primary,
  unique,
  name,
  table,
  cols,
  col,
  expression,
}: {
  db?: 'bt' | 'rr',
  primary?: boolean,
  unique?: boolean,
  name?: string,
  table: string,
  cols?: string[],
  col?: string,
  expression?: string,
}) {
  validateTableCols({ table, col, cols });

  cols ??= [TS.defined(col)];
  name = name ?? getIndexName(table, cols);
  const Model = getModelClass(table as ModelType);

  for (const c of cols) {
    if (!TS.hasProp(Model.getSchema(), c)) {
      throw new Error(`createIndex(${Model.type}): invalid col "${c}"`);
    }
  }

  const expressionCols = expression == null ? cols : [];
  expression = expression ?? `btree (${cols.map(
    c => (isColDescNullsLast(Model, c) ? '?? DESC NULLS LAST' : '??'),
  ).join(', ')})`;

  if (primary) {
    if (db !== 'rr') {
      try {
        await knexBT.raw(`
          ALTER TABLE ONLY ??
          DROP CONSTRAINT IF EXISTS ??
        `, [table, name]);
        await knexBT.raw(`
          ALTER TABLE ONLY ??
          ADD CONSTRAINT ??
          PRIMARY KEY (${cols.map(_ => '??').join(', ')})
        `, [table, name, ...cols]);
      } catch (err) {
        if (err instanceof Error && err.message.includes('other objects depend on it')) {
          printDebug(err, 'warn', { prod: 'always' });
        } else if (!(err instanceof Error)
          || !err.message.includes('multiple primary keys for table')) {
          throw err;
        } else {
          throw getErr(err, { ctx: 'createIndex', table, col });
        }
      }
    }

    if (db !== 'bt') {
      try {
        await knexRR.raw(`
          ALTER TABLE ONLY ??
          DROP CONSTRAINT IF EXISTS ??
        `, [table, name]);
        await knexRR.raw(`
          ALTER TABLE ONLY ??
          ADD CONSTRAINT ??
          PRIMARY KEY (${cols.map(_ => '??').join(', ')})
        `, [table, name, ...cols]);
      } catch (err) {
        if (err instanceof Error && err.message.includes('other objects depend on it')) {
          printDebug(err, 'warn', { prod: 'always' });
        } else if (!(err instanceof Error)
          || !err.message.includes('multiple primary keys for table')) {
          throw err;
        } else {
          throw getErr(err, { ctx: 'createIndex', table, col });
        }
      }
    }
  } else {
    try {
      await Promise.all([
        db !== 'rr'
          ? knexBT.raw(`
            CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ??
            ON ??
            USING ${expression}
            ${unique ? 'NULLS NOT DISTINCT' : ''}
            `, [name, table, ...expressionCols],
          )
          : null,
        db !== 'bt'
          ? knexRR.raw(`
            CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ??
            ON ??
            USING ${expression}
            ${unique ? 'NULLS NOT DISTINCT' : ''}
            `, [name, table, ...expressionCols],
          )
          : null,
      ]);
    } catch (err) {
      throw getErr(err, { ctx: 'createIndex', table, cols });
    }
  }
}
