import knex from 'services/knex';

export default function initCheckTimeZone() {
  if ((new Date()).getTimezoneOffset() !== 0) {
    throw new Error('Node TZ isn\'t UTC.');
  }

  void knex.queryBuilder()
    .select(raw('@@global.time_zone'))
    .then(rows => {
      if (rows?.[0]?.['@@global.time_zone'] !== '+00:00') {
        console.error('MySQL isn\'t UTC.');
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      }
    });
}
