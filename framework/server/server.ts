import cluster from 'cluster';
import os from 'os';
import { promises as fs } from 'fs';
import spdy from 'spdy';
import express from 'express';

import 'lib/initDotenv';
import 'lib/errorLogger/initErrorLogger';
import { DOMAIN_NAME, PORT } from 'settings';
import initCheckTimeZone from 'lib/initCheckTimeZone';
import getServerId from 'lib/getServerId';
import redis from 'services/redis';
import app from 'app';
import 'config/cronjobs';
import { startCronJobs } from 'services/cron/CronManager';

try {
  if (!process.env.SERVER || !process.env.NODE_ENV) {
    throw new Error('Env vars not set.');
  }

  if (cluster.isMaster) {
    if (process.env.NODE_ENV === 'production') {
      await initCheckTimeZone();
    } else {
      void wrapPromise(initCheckTimeZone(), 'fatal', 'Check timezone');
      void wrapPromise(redis.flushall(), 'warn', 'Redis flushall');
    }
  }

  const numCpus = process.env.NODE_ENV === 'production'
    ? os.cpus().length
    : 1;

  if (cluster.isMaster && numCpus > 1) {
    for (let i = 0; i < numCpus - 1; i++) {
      cluster.fork();
    }
  }

  // todo: mid/hard use nginx for reverse proxy
  // Nginx has half the req/sec the last time I tried
  if (process.env.SERVER === 'production') {
    let key = '';
    let cert = '';
    try {
      ({ key, cert } = await promiseObj({
        key: fs.readFile(TS.defined(process.env.SSL_KEY), 'utf8'),
        cert: fs.readFile(TS.defined(process.env.SSL_CERT), 'utf8'),
      }));
    } catch (err) {
      ErrorLogger.fatal(err, 'privkey.pem or cert.pem not found');
    }
    spdy
      .createServer({
        key: key.toString(),
        cert: cert.toString(),
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

  app.listen(
    PORT,
    () => printDebug(`Server started on worker ${getServerId()}`, 'success'),
  );

  void wrapPromise(startCronJobs(), 'error', 'Start cron jobs');
} catch (err) {
  ErrorLogger.fatal(err, 'Failed to start server');
}
