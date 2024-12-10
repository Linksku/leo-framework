import type { ReadableStream } from 'stream/web';
import crypto from 'crypto';
import { Readable } from 'stream';
import express from 'express';

import rateLimitMiddleware from 'routes/middlewares/rateLimitMiddleware';

const router = express.Router();
router.use(rateLimitMiddleware(60));

router.get('/', async (req, res) => {
  const { url, hash } = req.query;
  if (typeof url !== 'string' || typeof hash !== 'string') {
    res.status(400).end();
    return;
  }

  const expectedHash = crypto
    .createHash('md5')
    .update(url)
    .digest('base64url');
  if (expectedHash !== hash) {
    res.status(400).end();
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    res.status(response.status).end();
    return;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !response.body) {
    res.status(500).end();
    return;
  }

  res.set({
    'Content-Type': contentType,
    'Cache-Control': 'public,max-age=604800', // 1 week
  });
  Readable.fromWeb(response.body as ReadableStream<any>).pipe(res);
});

export default router;
