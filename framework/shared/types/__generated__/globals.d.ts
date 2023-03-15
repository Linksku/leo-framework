import type { default as _getErr } from '../../utils/getErr';
import type { default as _pause } from '../../utils/pause';
import type { default as _promiseObj } from '../../utils/promiseObj';
import type { default as _TS } from '../../utils/ts';

declare global {
  const getErr: typeof _getErr;
  const pause: typeof _pause;
  const promiseObj: typeof _promiseObj;
  const TS: typeof _TS;
}
