const fs = require('fs');
const path = require('path');

const globals = {
  // Node modules.
  dayjs: ['dayjs', 'default'],
  express: ['express', 'default'],
  fetch: ['node-fetch', 'default'],
  Model: ['objection', 'Model'],
  // Lib.
  EMPTY_ARR: ['./server/lib/emptyArr', 'default'],
  EMPTY_OBJ: ['./server/lib/emptyObj', 'default'],
  Entity: ['./server/models/core/Entity', 'default'],
  ErrorLogger: ['./server/lib/errorLogger/ErrorLogger', 'default'],
  HandledError: ['./server/lib/HandledError', 'default'],
  NOOP: ['./server/lib/noop', 'default'],
  pause: ['./shared/lib/pause', 'default'],
  promiseObj: ['./server/lib/promiseObj', 'default'],
  raw: ['./server/services/knex', 'raw'],
  SchemaConstants: ['./server/consts/schema', 'default'],
  TS: ['./shared/lib/tsHelpers', 'default'],
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
