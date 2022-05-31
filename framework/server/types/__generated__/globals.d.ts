import type { default as _fetch } from 'node-fetch';
import type { default as _EMPTY_ARR } from '../../utils/emptyArr';
import type { default as _EMPTY_OBJ } from '../../utils/emptyObj';
import type { default as _ErrorLogger } from '../../services/errorLogger/ErrorLogger';
import type { default as _getModelClass } from '../../services/model/getModelClass';
import type { default as _getRC } from '../../services/requestContext/getRequestContext';
import type { default as _HandledError } from '../../utils/HandledError';
import type { default as _NOOP } from '../../utils/noop';
import type { default as _printDebug } from '../../utils/printDebug';
import type { default as _entityQuery } from '../../services/model/entityQuery';
import type { default as _modelQuery } from '../../services/model/modelQuery';
import type { raw as _raw } from '../../services/knex/knexRR';
import type { default as _SchemaConstants } from '../../consts/schema';
import type { default as _wrapPromise } from '../../utils/wrapPromise';

declare global {
  const fetch: typeof _fetch;
  const EMPTY_ARR: typeof _EMPTY_ARR;
  const EMPTY_OBJ: typeof _EMPTY_OBJ;
  const ErrorLogger: typeof _ErrorLogger;
  const getModelClass: typeof _getModelClass;
  const getRC: typeof _getRC;
  const HandledError: typeof _HandledError;
  const NOOP: typeof _NOOP;
  const printDebug: typeof _printDebug;
  const entityQuery: typeof _entityQuery;
  const modelQuery: typeof _modelQuery;
  const raw: typeof _raw;
  const SchemaConstants: typeof _SchemaConstants;
  const wrapPromise: typeof _wrapPromise;
}
