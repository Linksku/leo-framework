const fs = require('fs');
const path = require('path');

const globals = {
  // Node modules.
  dayjs: 'dayjs',
  express: 'express',
  fetch: 'node-fetch',
  // Lib.
  EMPTY_ARR: ['./server/lib/emptyArr', 'default'],
  EMPTY_OBJ: ['./server/lib/emptyObj', 'default'],
  Entity: ['./server/models/core/Entity', 'default'],
  HandledError: ['./server/lib/HandledError', 'default'],
  hasOwnProperty: ['./shared/lib/hasOwnProperty', 'default'],
  Model: ['objection', 'Model'],
  NOOP: ['./server/lib/noop', 'default'],
  pause: ['./shared/lib/pause', 'default'],
  promiseObj: ['./server/lib/promiseObj', 'default'],
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
