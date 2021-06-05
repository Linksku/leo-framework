import knex from 'services/knex';

if ((new Date()).getTimezoneOffset() !== 0) {
  throw new Error('Node TZ isn\'t UTC.');
}

void knex.queryBuilder().select(knex.raw('@@global.time_zone'))
  .then(rows => {
    if (rows?.[0]?.['@@global.time_zone'] !== '+00:00') {
      console.error('MySQL isn\'t UTC.');
      process.exit(1);
    }
  });

export {};
