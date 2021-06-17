import cluster from 'cluster';
import os from 'os';
import fs from 'fs';
import spdy from 'spdy';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';

import { PORT, DOMAIN_NAME } from 'settings';

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

dotenv.config({
  path: process.env.SERVER === 'production'
    ? '../../src/.env'
    : 'src/.env',
});

require('lib/initCheckTimeZone');

// todo: mid/mid investigate why restarting server is slow
if (cluster.isMaster) {
  const numCpus = process.env.NODE_ENV === 'production'
    ? os.cpus().length
    : 2;
  for (let i = 0; i < numCpus; i++) {
    cluster.fork();
  }
} else {
  // eslint-disable-next-line global-require
  const app = require('app').default;

  if (process.env.SERVER === 'production') {
    spdy
      .createServer({
        key: fs.readFileSync(process.env.SSL_KEY as string, 'utf8').toString(),
        cert: fs.readFileSync(process.env.SSL_CERT as string, 'utf8').toString(),
      }, app)
      .listen(443);

    const http = express();

    http.get(
      '/.well-known/acme-challenge',
      express.static(path.resolve('./build/web/.well-known/acme-challenge')),
    );

    http.get('*', (req, res) => {
      res.redirect(`https://${DOMAIN_NAME}${req.url}`);
    });
  }

  app.listen(
    PORT,
    () => console.log(`Server started on worker ${cluster.worker.id}`),
  );
}
