import type { default as _buildPath } from '../../core/buildPath';
import type { default as _EMPTY_ARR } from '../../utils/emptyArr';
import type { default as _EMPTY_OBJ } from '../../utils/emptyObj';
import type { default as _getErr } from '../../utils/getErr';
import type { default as _pause } from '../../utils/pause';
import type { default as _plural } from '../../utils/plural';
import type { default as _promiseObj } from '../../utils/promiseObj';
import type { default as _TS } from '../../utils/ts';
import type { default as _withErrCtx } from '../../utils/withErrCtx';

declare global {
  const buildPath: typeof _buildPath;
  const EMPTY_ARR: typeof _EMPTY_ARR;
  const EMPTY_OBJ: typeof _EMPTY_OBJ;
  const getErr: typeof _getErr;
  const pause: typeof _pause;
  const plural: typeof _plural;
  const promiseObj: typeof _promiseObj;
  const TS: typeof _TS;
  const withErrCtx: typeof _withErrCtx;
}
