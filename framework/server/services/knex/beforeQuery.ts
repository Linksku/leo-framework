import type { Knex } from 'knex';
import { IS_PROFILING_APIS } from 'config';

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
  const sqlLower = sql?.toLowerCase()?.trim();
  if (db === 'rr' && sqlLower && (
    sqlLower.startsWith('insert ')
      || sqlLower.startsWith('update ')
      || sqlLower.startsWith('delete ')
  )) {
    printDebug('beforeQuery: writes not allow in read-replica', 'error');
  }

  if (process.env.PRODUCTION
    || process.env.IS_SERVER_SCRIPT
    || IS_PROFILING_APIS
    || !sql
    || sql.startsWith('explain ')) {
    return;
  }

  const rc = getRC();
  if (rc) {
    // todo: low/med fix numDbQueries
    rc.numDbQueries++;

    if (rc.loadTesting) {
      return;
    }
  }

  if (rc?.debug) {
    printDebug(
      // todo: low/med add async context for apis
      rc ? `${db.toUpperCase()} Query ${rc.apiPath}` : `${db.toUpperCase()} Query`,
      'success',
      {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        details: knex.raw(sql, bindings).toString(),
      },
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
                rc ? `Slow RR Query ${rc.apiPath}` : 'Slow RR Query',
                'error',
                {
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  details: `${knex.raw(sql, bindings).toString()}\n${plan}`,
                },
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
