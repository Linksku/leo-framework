import knexBT from 'services/knex/knexBT';
import getIndexName from 'utils/db/getIndexName';
import validateTableCols from './validateTableCols';

export default async function createForeignKey({
  name,
  table,
  col,
  toTable,
  toCol = 'id',
}: {
  name?: string,
  table: string,
  col: string,
  toTable: string,
  toCol?: string,
}) {
  validateTableCols({ table, col });

  name = name ?? getIndexName(table, col, true);
  const Model = getModelClass(table as ModelType);
  const ToModel = getModelClass(toTable as ModelType);

  if (!TS.hasProp(Model.getSchema(), col)) {
    throw new Error(`createIndex(${Model.type}): invalid col "${col}"`);
  }
  if (!TS.hasProp(ToModel.getSchema(), toCol)) {
    throw new Error(`createIndex(${Model.type}): invalid to col ${toTable}.${toCol}`);
  }

  try {
    await knexBT.schema.alterTable(table, builder => {
      builder.foreign(col, name).references(toCol).inTable(toTable)
        .onUpdate('restrict')
        .onDelete('restrict');
    });
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('already exists')) {
      throw getErr(err, { ctx: 'createForeignKey', table, col });
    }
  }
}
