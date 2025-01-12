// eslint-disable-next-line import/order
import 'utils/serverStartTime';
import 'core/initEnv';

import cluster from 'cluster';
import { promises as fs } from 'fs';
import https from 'https';
import path from 'path';
import express from 'express';

import 'services/healthcheck/importHealthchecks';
import 'config/cronjobs';
import { DOMAIN_NAME, DEV_PORT } from 'consts/server';
import { NUM_CLUSTER_SERVERS } from 'consts/infra';
import { startHealthchecks } from 'services/healthcheck/HealthcheckManager';
import initCheckPgExtensions from 'core/initServer/initCheckPgExtensions';
import initCheckTimeZone from 'core/initServer/initCheckTimeZone';
import initCheckRedisPassword from 'core/initServer/initCheckRedisPassword';
import fetchEachModelOnce from 'core/initServer/fetchEachModelOnce';
import scheduleRestartWorker from 'core/initServer/scheduleRestartWorker';
import redisFlushAll from 'utils/infra/redisFlushAll';
import getServerId from 'utils/getServerId';
import app from 'app';
import { startCronJobs } from 'services/cron/CronManager';
import { MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT } from 'consts/coreRedisNamespaces';
import stringify from 'utils/stringify';
import { INDEX_ERROR_HEADERS } from 'consts/httpHeaders';

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
        withErrCtx(initCheckRedisPassword(), 'server: initCheckRedisPassword'),
        withErrCtx(fetchEachModelOnce(), 'server: fetchEachModelOnce'),
      ]);
    } else {
      try {
        await redisFlushAll([...MODEL_NAMESPACES, PUB_SUB, RATE_LIMIT]);
      } catch (err) {
        if (err instanceof Error && err.message.includes('timed out')) {
          ErrorLogger.warn(err, { ctx: 'redisFlushAll' });
        } else {
          throw err;
        }
      }
      wrapPromise(initCheckPgExtensions(), 'fatal', 'server: initCheckPgExtensions');
      wrapPromise(initCheckTimeZone(), 'fatal', 'server: initCheckTimeZone');
      wrapPromise(initCheckRedisPassword(), 'error', 'server: initCheckRedisPassword');
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
    try {
      await withErrCtx(startCronJobs(), 'server: startCronjobs');
    } catch (err) {
      if (!process.env.PRODUCTION) {
        ErrorLogger.error(err, { ctx: 'server: startCronjobs' });
      } else {
        throw err;
      }
    }
    withErrCtx(() => scheduleRestartWorker(), 'server: scheduleRestartWorker');

    // Note: Nginx has half the req/sec the last time I tried
    if (process.env.SERVER === 'production') {
      if (!process.env.SSL_KEY || !process.env.SSL_CERT) {
        throw new Error('server: SSL env not set');
      }

      let sslKey = '';
      let sslCert = '';
      try {
        ({ sslKey, sslCert } = await promiseObj({
          sslKey: fs.readFile(process.env.SSL_KEY, 'utf8'),
          sslCert: fs.readFile(process.env.SSL_CERT, 'utf8'),
        }));
      } catch (err) {
        ErrorLogger.error(err, { ctx: 'privkey.pem or cert.pem not found' });
      }

      if (sslKey && sslCert) {
        // todo: mid/blocked add http2
        // Express doesn't support http2 yet: https://github.com/expressjs/express/issues/2761
        const server = https
          .createServer({
            key: sslKey,
            cert: sslCert,
          }, app)
          .listen(
            443,
            () => {
              printDebug(
                `Server started on worker ${getServerId()}`,
                'success',
                { prod: 'always' },
              );
            },
          )
          .on('error', err => ErrorLogger.error(err, { ctx: 'Https Express error' }));
        server.keepAliveTimeout = 30 * 1000;
      }

      const http = express();
      http.use('/.well-known/acme-challenge', express.static(
        path.resolve(`./build/${process.env.NODE_ENV}/web/.well-known/acme-challenge`),
        {
          maxAge: 0,
          redirect: false,
          index: false,
        },
      ));
      http.get('*', (req, res) => {
        if (sslKey && sslCert) {
          res.redirect(`https://${DOMAIN_NAME}${req.url}`);
        } else {
          res
            .status(404)
            .set(INDEX_ERROR_HEADERS)
            .send('<p>Not found</p>');
        }
      });
      http.listen(80)
        .on('error', err => ErrorLogger.error(err, { ctx: 'Http Express error' }));
    } else {
      const server = app
        .listen(
          DEV_PORT,
          () => {
            printDebug(`Server started on worker ${getServerId()}`, 'success');
          },
        )
        .on('error', err => ErrorLogger.error(err, { ctx: 'Express error' }));
      server.keepAliveTimeout = 30 * 1000;
    }
  }
} catch (err) {
  await ErrorLogger.fatal(err, { ctx: 'Failed to start server' });
}
