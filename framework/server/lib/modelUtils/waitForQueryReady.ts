import type { Knex } from 'knex';
import { performance } from 'perf_hooks';

import { HTTP_TIMEOUT } from 'settings';

// Mostly for testing.
export default async function waitForQueryReady(
  query: Knex.QueryBuilder<any>,
  {
    minWaitTime = 100,
    maxWaitTime = HTTP_TIMEOUT / 2,
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

  for (let i = 0; i < (process.env.IS_SERVER_SCRIPT ? 10_000 : 10); i++) {
    lastErr = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await query.clone();
      if (rows.length) {
        return true;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'Non-error was thrown.';
    }

    if (performance.now() + waitTime - startTime >= maxWaitTime) {
      throw new Error(`waitForQueryReady: timed out (last error: ${lastErr})`);
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(waitTime);

    if (exponentialBackoff) {
      waitTime *= 2;
    }
  }

  throw new Error(`waitForQueryReady: possible infinite loop (last error: ${lastErr}).`);
}