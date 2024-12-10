import dayjs from 'dayjs';

import isNumericString from 'utils/isNumericString';
import stringify from 'utils/stringify';

const INT_TYPES = ['smallint', 'int', 'integer', 'bigint'];

const FLOAT_TYPES = ['real', 'double precision'];

const STR_TYPES = ['text', 'character varying', 'character'];

export default function pgValToJSType(val: string) {
  if (val === 'NULL') {
    return null;
  }
  if (val === 'true' || val === 'false') {
    return val === 'true';
  }

  // Numbers
  if (isNumericString(val)) {
    return Number.parseFloat(val);
  }
  for (const intType of INT_TYPES) {
    if (val.startsWith('\'') && val.endsWith(`'::${intType}`)) {
      return Number.parseInt(
        val.slice(1, -`'::${intType}`.length),
        10,
      );
    }
  }
  for (const floatType of FLOAT_TYPES) {
    if (val.startsWith('\'') && val.endsWith(`'::${floatType}`)) {
      return Number.parseFloat(
        val.slice(1, -`'::${floatType}`.length),
      );
    }
  }

  // Strings
  if (val.startsWith('\'') && val.endsWith('\'')) {
    return val.slice(1, -1);
  }
  for (const strType of STR_TYPES) {
    if (val.startsWith('\'') && val.endsWith(`'::${strType}`)) {
      return val.slice(1, -`'::${strType}`.length);
    }
  }

  // Dates
  if (val === 'CURRENT_TIMESTAMP(6)') {
    return val;
  }
  if (val.endsWith('::timestamp')) {
    return dayjs(val.slice(1, -'\'::timestamp'.length)).toDate();
  }

  if ((val.startsWith('[') && val.endsWith(']'))
    || (val.startsWith('{') && val.endsWith('}'))) {
    return JSON.parse(val);
  }
  throw new Error(`pgValToJSType: unhandled type: ${stringify(val)}`);
}
