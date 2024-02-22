import type { Knex } from 'knex';

import { API_POST_TIMEOUT } from 'consts/server';

// Mostly for testing.
export default async function waitForQueryReady(
  query: Knex.QueryBuilder<any, unknown[]>,
  {
    minWaitTime = 100,
    maxWaitTime = API_POST_TIMEOUT / 2,
    exponentialBackoff = true,
  } = {},
) {
  const startTime = performance.now();
  let waitTime = minWaitTime;
  let lastErr: string | null = null;

  query = query
    .clear('select')
    .select(raw('1'))
    .limit(1, { skipBinding: true });

  for (let i = 0; i < (process.env.IS_SERVER_SCRIPT ? 10_000 : 100); i++) {
    lastErr = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await query.clone()
        .timeout(Math.max(10, maxWaitTime - (performance.now() - startTime)));
      if (rows.length) {
        return true;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'Non-error was thrown.';
    }

    if (performance.now() + waitTime - startTime >= maxWaitTime) {
      throw getErr('waitForQueryReady: timed out', { lastErr });
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(waitTime);

    if (exponentialBackoff) {
      waitTime *= 2;
    }
  }

  throw getErr('waitForQueryReady: reached end of loop', { lastErr });
}
