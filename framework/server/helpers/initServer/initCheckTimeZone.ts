import cluster from 'cluster';

import knexBT from 'services/knex/knexBT';

export default async function initCheckTimeZone() {
  if ((new Date()).getTimezoneOffset() !== 0) {
    ErrorLogger.fatal(new Error('Node TZ isn\'t UTC.'));
  }

  if (!cluster.isMaster) {
    return;
  }

  const rows = await knexBT.raw('show timezone');
  if (rows?.rows?.[0]?.TimeZone !== 'UTC') {
    ErrorLogger.fatal(new Error('DB isn\'t UTC.'));
  }
}
