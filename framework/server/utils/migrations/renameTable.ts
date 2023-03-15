import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function renameTable({ isMV, oldName, newName }: {
  isMV: boolean,
  oldName: string,
  newName: string,
}) {
  if (!isMV) {
    await knexBT.raw('ALTER TABLE IF EXISTS ?? RENAME TO ??', [oldName, newName]);
  }
  await knexRR.raw('ALTER TABLE IF EXISTS ?? RENAME TO ??', [oldName, newName]);
}
