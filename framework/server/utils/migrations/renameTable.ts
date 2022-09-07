import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function renameTable({ isMV, oldName, newName }: {
  isMV: boolean,
  oldName: string,
  newName: string,
}) {
  if (!isMV) {
    await knexBT.schema.renameTable(oldName, newName);
  }
  await knexRR.schema.renameTable(oldName, newName);
}
