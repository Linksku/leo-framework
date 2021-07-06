import cluster from 'cluster';
import os from 'os';
import { promises as fs } from 'fs';
import spdy from 'spdy';
import dotenv from 'dotenv';
import express from 'express';

import { DOMAIN_NAME, PORT } from 'settings';

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

  (async () => {
    // todo: mid/hard use nginx for reverse proxy
    // Nginx has half the req/sec the last time I tried
    if (process.env.SERVER === 'production') {
      let key = '';
      let cert = '';
      try {
        ({ key, cert } = await promiseObj({
          key: fs.readFile(defined(process.env.SSL_KEY), 'utf8'),
          cert: fs.readFile(defined(process.env.SSL_CERT), 'utf8'),
        }));
      } catch {
        console.log('privkey.pem or cert.pem not found.');
      }
      spdy
        .createServer({
          key: key.toString(),
          cert: cert.toString(),
        }, app)
        .listen(
          443,
          () => console.log(`Server started on worker ${cluster.worker.id}`),
        );

      const http = express();
      http.get('*', (req, res) => {
        res.redirect(`https://${DOMAIN_NAME}${req.url}`);
      });
    }

    app.listen(
      PORT,
      () => console.log(`Server started on worker ${cluster.worker.id}`),
    );
  })()
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
