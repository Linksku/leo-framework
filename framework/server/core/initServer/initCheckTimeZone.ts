import cluster from 'cluster';

export default async function initCheckTimeZone() {
  if ((new Date()).getTimezoneOffset() !== 0) {
    await ErrorLogger.fatal(new Error('initCheckTimeZone: Node TZ isn\'t UTC'));
  }

  if (!cluster.isMaster) {
    return;
  }

  const rows = await rawSelect(
    'bt',
    'SHOW TIMEZONE',
  );
  if (rows?.rows?.[0]?.TimeZone !== 'UTC') {
    await ErrorLogger.fatal(new Error('initCheckTimeZone: DB isn\'t UTC'));
  }
}
