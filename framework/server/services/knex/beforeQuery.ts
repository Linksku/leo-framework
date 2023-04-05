import type { Knex } from 'knex';

export default function beforeQuery({
  db,
  knex,
  sql,
  bindings,
}: {
  db: 'bt' | 'mz' | 'rr',
  knex: Knex,
  sql?: string,
  bindings: any,
}) {
  if (process.env.PRODUCTION
    || process.env.IS_SERVER_SCRIPT
    || !sql
    || sql.startsWith('explain ')) {
    return;
  }

  const rc = getRC();
  if (rc) {
    // todo: low/mid fix numDbQueries
    rc.numDbQueries++;

    if (rc.profiling) {
      return;
    }
  }

  if (rc?.debug) {
    printDebug(
      rc ? `${db.toUpperCase()} Query ${rc.path}` : `${db.toUpperCase()} Query`,
      'success',
      { details: knex.raw(sql, bindings).toString() },
    );

    if (db === 'rr') {
      knex.raw(`explain analyze ${sql}`, bindings)
        .then(
          results => {
            const rows = TS.assertType<{ 'QUERY PLAN': string }[]>(
              results.rows,
              val => Array.isArray(val) && val.every(r => r['QUERY PLAN']),
            );
            const plan = rows.map(r => r['QUERY PLAN']).join('\n');
            const matches = plan.match(/Execution Time: (\d+\.\d+) ms/);
            const execTime = matches ? Number.parseFloat(matches[1]) : 0;
            if (execTime > 10) {
              printDebug(
                rc ? `Slow RR Query ${rc.path}` : 'Slow RR Query',
                'error',
                { details: `${sql}\n${plan}` },
              );
            }
          },
          NOOP,
        )
        .catch(err => {
          printDebug(getErr(err, { ctx: `beforeQuery(${db}): explain analyze` }), 'warn');
        });
    }
  }
}
