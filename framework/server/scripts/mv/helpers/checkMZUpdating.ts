import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';

export default async function checkMZUpdating(timeout = 60 * 1000) {
  const rows = await entityQuery(MzTest, knexBT)
    .patch({
      // @ts-ignore raw
      version: raw(`
        CASE
          WHEN version + 1 >= 2147483647 THEN 1
          ELSE version + 1
        END
      `),
    })
    .where({ id: 1 })
    .returning('*');
  const updated = rows[0];
  if (!updated) {
    await ErrorLogger.fatal(new Error('checkMZUpdating: MzTest.update failed'));
  }

  await retry(
    async () => {
      const row = await modelQuery(MzTestMV)
        .select(raw('1'))
        .where({ id: 1 })
        .where(MzTestMV.cols.version, '>=', updated.version)
        .first();
      if (!row) {
        throw new Error('MzTestMV hasn\'t updated');
      }
    },
    {
      timeout,
      interval: 1000,
      ctx: 'checkMZUpdating',
    },
  );
}
