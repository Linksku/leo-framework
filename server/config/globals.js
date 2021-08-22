const fs = require('fs');
const path = require('path');

const globals = {
  // Node modules.
  dayjs: 'dayjs',
  express: 'express',
  fetch: 'node-fetch',
  Model: ['objection', 'Model'],
  // Built-ins.
  hasOwnProperty: ['./shared/lib/builtIns/hasOwnProperty', 'default'],
  objectEntries: ['./shared/lib/builtIns/objectEntries', 'default'],
  objectKeys: ['./shared/lib/builtIns/objectKeys', 'default'],
  objectValues: ['./shared/lib/builtIns/objectValues', 'default'],
  // Lib.
  defined: ['./shared/lib/defined', 'default'],
  EMPTY_ARR: ['./server/lib/emptyArr', 'default'],
  EMPTY_OBJ: ['./server/lib/emptyObj', 'default'],
  Entity: ['./server/models/core/Entity', 'default'],
  ErrorLogger: ['./server/lib/errorLogger/ErrorLogger', 'default'],
  filterNulls: ['./shared/lib/filterNulls', 'default'],
  HandledError: ['./server/lib/HandledError', 'default'],
  hasDefinedProperty: ['./shared/lib/hasDefinedProperty', 'default'],
  inArray: ['./shared/lib/inArray', 'default'],
  NOOP: ['./server/lib/noop', 'default'],
  objValOrSetDefault: ['./shared/lib/objValOrSetDefault', 'default'],
  pause: ['./shared/lib/pause', 'default'],
  promiseObj: ['./server/lib/promiseObj', 'default'],
  raw: ['./server/services/knex', 'raw'],
  SchemaConstants: ['./server/consts/schema', 'default'],
};

const filenames = fs.readdirSync(path.resolve('./server/models'));
for (const filename of filenames) {
  if (!filename.endsWith('.js') && !filename.endsWith('.ts')) {
    continue;
  }

  const cls = filename.slice(0, filename.lastIndexOf('.'));
  globals[cls] = [`./server/models/${cls}`, 'default'];
}

module.exports = globals;
