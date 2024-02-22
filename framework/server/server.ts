import 'core/initEnv';

import type { Server } from 'http';
import cluster from 'cluster';
import { promises as fs } from 'fs';
import https from 'https';
import express from 'express';

import 'services/healthcheck/importHealthchecks';
import 'config/cronjobs';
import { DOMAIN_NAME, PORT } from 'consts/server';
import { NUM_CLUSTER_SERVERS } from 'consts/infra';
import { startHealthchecks } from 'services/healthcheck/HealthcheckManager';
import initCheckPgExtensions from 'core/initServer/initCheckPgExtensions';
import initCheckTimeZone from 'core/initServer/initCheckTimeZone';
import initCheckRedisPass from 'core/initServer/initCheckRedisPass';
import fetchEachModelOnce from 'core/initServer/fetchEachModelOnce';
import scheduleRestartWorker from 'core/initServer/scheduleRestartWorker';
import redisFlushAll from 'utils/infra/redisFlushAll';
import getServerId from 'core/getServerId';
import app from 'app';
import { startCronJobs } from 'services/cron/CronManager';
import { MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT } from 'consts/coreRedisNamespaces';
import stringify from 'utils/stringify';

process.on('unhandledRejection', reason => {
  ErrorLogger.error(new Error(`unhandled rejection: ${stringify(reason)}`));
});

try {
  if (!process.env.SERVER || !process.env.NODE_ENV) {
    throw new Error('server: env vars not set.');
  }

  if (cluster.isMaster) {
    printDebug('Starting server.', 'info', { prod: 'always' });

    if (process.env.PRODUCTION) {
      await Promise.all([
        withErrCtx(initCheckPgExtensions(), 'server: initCheckPgExtensions'),
        withErrCtx(initCheckTimeZone(), 'server: initCheckTimeZone'),
        withErrCtx(initCheckRedisPass(), 'server: initCheckRedisPass'),
        withErrCtx(fetchEachModelOnce(), 'server: fetchEachModelOnce'),
      ]);
    } else {
      await redisFlushAll([...MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT]);
      wrapPromise(initCheckPgExtensions(), 'fatal', 'server: initCheckPgExtensions');
      wrapPromise(initCheckTimeZone(), 'fatal', 'server: initCheckTimeZone');
      wrapPromise(initCheckRedisPass(), 'fatal', 'server: initCheckRedisPass');
      wrapPromise(fetchEachModelOnce(), 'fatal', 'server: fetchEachModelOnce');
    }

    if (NUM_CLUSTER_SERVERS > 1) {
      for (let i = 0; i < NUM_CLUSTER_SERVERS; i++) {
        cluster.fork();
      }
    }

    cluster.on('exit', deadWorker => {
      printDebug(`Worker ${deadWorker.process.pid} died, restarting.`, 'warn', { prod: 'always' });
      cluster.fork();
    });
  }

  if (!cluster.isMaster || NUM_CLUSTER_SERVERS === 1) {
    // todo: low/mid share healthcheck state within cluster
    withErrCtx(() => startHealthchecks(), 'server: startHealthchecks');
    await withErrCtx(startCronJobs(), 'server: startCronjobs');
    withErrCtx(() => scheduleRestartWorker(), 'server: scheduleRestartWorker');

    let sslKey = '';
    let sslCert = '';
    if (process.env.SERVER === 'production') {
      if (!process.env.SSL_KEY) {
        throw new Error('server: SSL_KEY not set');
      }

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
    let server: Server;
    if (process.env.SERVER === 'production') {
      // todo: mid/blocked add http2
      // Express doesn't support http2 yet: https://github.com/expressjs/express/issues/2761
      server = https
        .createServer({
          key: sslKey,
          cert: sslCert,
        }, app)
        .listen(
          443,
          () => printDebug(`Server started on worker ${getServerId()}`, 'success', { prod: 'always' }),
        )
        .on('error', err => ErrorLogger.error(err, { ctx: 'Express error' }));

      const http = express();
      http.get('*', (req, res) => {
        res.redirect(`https://${DOMAIN_NAME}${req.url}`);
      });
    } else {
      server = app
        .listen(
          PORT,
          () => printDebug(`Server started on worker ${getServerId()}`, 'success'),
        )
        .on('error', err => ErrorLogger.error(err, { ctx: 'Express error' }));
    }

    server.keepAliveTimeout = 30 * 1000;
  }
} catch (err) {
  await ErrorLogger.fatal(err, { ctx: 'Failed to start server' });
}
