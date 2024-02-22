import type { default as _getErr } from '../../utils/getErr';
import type { default as _pause } from '../../utils/pause';
import type { default as _pluralize } from '../../utils/pluralize';
import type { default as _promiseObj } from '../../utils/promiseObj';
import type { default as _TS } from '../../utils/ts';
import type { default as _withErrCtx } from '../../utils/withErrCtx';

declare global {
  const getErr: typeof _getErr;
  const pause: typeof _pause;
  const pluralize: typeof _pluralize;
  const promiseObj: typeof _promiseObj;
  const TS: typeof _TS;
  const withErrCtx: typeof _withErrCtx;
}
