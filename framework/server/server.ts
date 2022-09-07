import cluster from 'cluster';
import os from 'os';
import { promises as fs } from 'fs';
import https from 'https';
import express from 'express';
import chalk from 'chalk';

import 'helpers/initServer/initDotenv';
import 'services/errorLogger/initErrorLogger';
import { DOMAIN_NAME, PORT } from 'settings';
import initCheckPg from 'helpers/initServer/initCheckPg';
import initCheckMz from 'helpers/initServer/initCheckMz';
import initCheckPgExtensions from 'helpers/initServer/initCheckPgExtensions';
import initCheckTimeZone from 'helpers/initServer/initCheckTimeZone';
import redisFlushAll from 'utils/infra/redisFlushAll';
import getServerId from 'utils/getServerId';
import app from 'app';
import 'config/cronjobs';
import { startCronJobs } from 'services/cron/CronManager';

// todo: high/hard add testing, maybe Cypress
try {
  if (!process.env.SERVER || !process.env.NODE_ENV) {
    throw new Error('Env vars not set.');
  }

  const numCpus = process.env.PRODUCTION
    ? os.cpus().length
    : 1;
  let sslKey = '';
  let sslCert = '';
  if (process.env.SERVER === 'production') {
    try {
      ({ sslKey, sslCert } = await promiseObj({
        sslKey: fs.readFile(TS.defined(process.env.SSL_KEY), 'utf8'),
        sslCert: fs.readFile(TS.defined(process.env.SSL_CERT), 'utf8'),
      }));
    } catch (err) {
      ErrorLogger.fatal(ErrorLogger.castError(err), 'privkey.pem or cert.pem not found');
    }
  }

  if (cluster.isMaster) {
    if (process.env.PRODUCTION) {
      await initCheckPg();
      await Promise.all([
        initCheckMz(),
        initCheckPgExtensions(),
        initCheckTimeZone(),
      ]);
    } else {
      await initCheckPg();
      wrapPromise(initCheckMz(), 'fatal', 'Check MZ');
      wrapPromise(initCheckPgExtensions(), 'fatal', 'Check PG extensions');
      wrapPromise(initCheckTimeZone(), 'fatal', 'Check timezone');
      // todo: mid/mid only flush cache, keep Bull queue, etc
      wrapPromise(redisFlushAll(), 'warn', 'Redis flushall');
    }

    if (numCpus > 1) {
      for (let i = 0; i < numCpus; i++) {
        cluster.fork();
      }
    }

    wrapPromise(startCronJobs(), 'error', 'Start cron jobs');
  }

  if (!cluster.isMaster || numCpus === 1) {
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
        );

      const http = express();
      http.get('*', (req, res) => {
        res.redirect(`https://${DOMAIN_NAME}${req.url}`);
      });
    }

    app
      .listen(
        PORT,
        // eslint-disable-next-line no-console
        () => console.log(chalk.green(`Server started on worker ${getServerId()}`)),
      )
      .on('error', err => ErrorLogger.warn(ErrorLogger.castError(err), 'Express error'));
  }
} catch (err) {
  ErrorLogger.fatal(ErrorLogger.castError(err), 'Failed to start server');
}
