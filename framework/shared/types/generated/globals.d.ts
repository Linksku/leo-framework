import type { default as _pause } from '../../lib/pause';
import type { default as _promiseObj } from '../../lib/promiseObj';
import type { default as _TS } from '../../lib/tsHelpers';

declare global {
  const pause: typeof _pause;
  const promiseObj: typeof _promiseObj;
  const TS: typeof _TS;
}
