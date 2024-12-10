import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import validateTableCols from './validateTableCols';

export default async function alterColumnType({
  isMV,
  table,
  col,
  type,
  notNull,
}: {
  isMV: boolean,
  table: string,
  col: string,
  type: string,
  notNull?: boolean,
}) {
  if (!/^[\w\s()]+$/i.test(type)) {
    throw new Error(`alterColumnType: invalid type: ${type}`);
  }
  validateTableCols({ table, col });

  try {
    if (!isMV) {
      await knexBT.raw(`
        ALTER TABLE ??
        ALTER COLUMN ?? TYPE ${type},
        ALTER COLUMN ?? ${notNull ? 'SET NOT NULL' : 'DROP NOT NULL'}
      `, [table, col, col]);
    }
    await knexRR.raw(`
      ALTER TABLE ??
      ALTER COLUMN ?? TYPE ${type},
      ALTER COLUMN ?? ${notNull ? 'SET NOT NULL' : 'DROP NOT NULL'}
    `, [table, col, col]);
  } catch (err) {
    throw getErr(err, { ctx: 'renameTable', table, col });
  }
}
