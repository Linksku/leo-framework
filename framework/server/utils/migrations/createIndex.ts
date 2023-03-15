import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import getIndexName from 'utils/db/getIndexName';
import isColDescNullsLast from 'utils/models/isColDescNullsLast';

export default async function createIndex({
  db,
  primary,
  unique,
  name,
  table,
  cols: _cols,
  col,
  expression,
}: {
  db: 'bt' | 'rr',
  primary?: boolean,
  unique?: boolean,
  name?: string,
  table: string,
  cols?: string[],
  col?: string,
  expression?: string,
}) {
  const cols = _cols ?? [TS.defined(col)];
  name ??= getIndexName(table, cols);
  const Model = getModelClass(table as ModelType);

  for (const c of cols) {
    if (!TS.hasProp(Model.getSchema(), c)) {
      throw new Error(`createIndex(${Model.type}): invalid col "${c}"`);
    }
  }

  const expressionCols = expression == null ? cols : [];
  expression ??= `btree (${cols.map(
    c => (isColDescNullsLast(Model, c) ? '?? DESC NULLS LAST' : '??'),
  ).join(', ')})`;

  const knex = db === 'bt' ? knexBT : knexRR;
  if (primary) {
    try {
      await knex.raw(`
        ALTER TABLE ONLY ??
        ADD CONSTRAINT ??
        PRIMARY KEY (${cols.map(_ => '??').join(', ')})
      `, [table, name, ...cols]);

      if (db === 'bt' && cols.length === 1 && cols[0] === 'id') {
        await knexBT.raw(`
          ALTER TABLE public."${table}"
          ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME public."${table}_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
          );
        `);
      }
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('multiple primary keys for table')) {
        throw err;
      }
    }
  } else {
    await knex.raw(`
      CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ??
      ON ??
      USING ${expression}
      ${unique ? 'NULLS NOT DISTINCT' : ''}
      `, [name, table, ...expressionCols],
    );
  }
}
