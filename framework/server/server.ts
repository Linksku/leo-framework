import cluster from 'cluster';
import { promises as fs } from 'fs';
import https from 'https';
import express from 'express';
import chalk from 'chalk';

import 'helpers/initDotenv';
import 'services/healthcheck/importHealthchecks';
import 'config/cronjobs';
import { DOMAIN_NAME, PORT } from 'settings';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';
import { startHealthchecks } from 'services/healthcheck/HealthcheckManager';
import initCheckPgExtensions from 'helpers/initServer/initCheckPgExtensions';
import fetchEachModelOnce from 'helpers/initServer/fetchEachModelOnce';
import initCheckTimeZone from 'helpers/initServer/initCheckTimeZone';
import scheduleRestartWorker from 'helpers/initServer/scheduleRestartWorker';
import redisFlushAll from 'utils/infra/redisFlushAll';
import getServerId from 'utils/getServerId';
import app from 'app';
import { startCronJobs } from 'services/cron/CronManager';
import { MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT } from 'consts/coreRedisNamespaces';

process.on('unhandledRejection', reason => {
  ErrorLogger.error(new Error(`unhandled rejection: ${reason}`));
});

try {
  if (!process.env.SERVER || !process.env.NODE_ENV || !process.env.SSL_KEY) {
    throw new Error('server: env vars not set.');
  }

  if (cluster.isMaster) {
    if (process.env.PRODUCTION) {
      await Promise.all([
        initCheckPgExtensions(),
        initCheckTimeZone(),
        fetchEachModelOnce(),
      ]);
    } else {
      await redisFlushAll([...MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT]);
      wrapPromise(initCheckPgExtensions(), 'fatal', 'Check PG extensions');
      wrapPromise(initCheckTimeZone(), 'fatal', 'Check timezone');
      wrapPromise(fetchEachModelOnce(), 'fatal', 'Fetch models');
    }

    if (NUM_CLUSTER_SERVERS > 1) {
      for (let i = 0; i < NUM_CLUSTER_SERVERS; i++) {
        cluster.fork();
      }
    }

    cluster.on('exit', deadWorker => {
      printDebug(`Worker ${deadWorker.process.pid} died, restarting.`, 'warn');
      cluster.fork();
    });
  }

  if (!cluster.isMaster || NUM_CLUSTER_SERVERS === 1) {
    // todo: low/mid share healthcheck state within cluster
    startHealthchecks();
    await startCronJobs();
    scheduleRestartWorker();

    let sslKey = '';
    let sslCert = '';
    if (process.env.SERVER === 'production') {
      try {
        ({ sslKey, sslCert } = await promiseObj({
          sslKey: fs.readFile(process.env.SSL_KEY, 'utf8'),
          sslCert: fs.readFile(process.env.SSL_CERT, 'utf8'),
        }));
      } catch (err) {
        await ErrorLogger.fatal(err, { ctx: 'privkey.pem or cert.pem not found' });
      }
    }

    // Note: Nginx has half the req/sec the last time I tried
    if (process.env.SERVER === 'production') {
      // todo: mid/blocked add http2
      // Express doesn't support http2 yet: https://github.com/expressjs/express/issues/2761
      https
        .createServer({
          key: sslKey,
          cert: sslCert,
        }, app)
        .listen(
          443,
          () => printDebug(`Server started on worker ${getServerId()}`, 'success'),
        )
        .on('error', err => ErrorLogger.error(err, { ctx: 'Express error' }));

      const http = express();
      http.get('*', (req, res) => {
        res.redirect(`https://${DOMAIN_NAME}${req.url}`);
      });
    } else {
      app
        .listen(
          PORT,
          // eslint-disable-next-line no-console
          () => console.log(chalk.green(`Server started on worker ${getServerId()}`)),
        )
        .on('error', err => ErrorLogger.error(err, { ctx: 'Express error' }));
    }
  }
} catch (err) {
  await ErrorLogger.fatal(err, { ctx: 'Failed to start server' });
}
