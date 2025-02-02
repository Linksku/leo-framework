import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import baseConfig from './webpack.server.production.js';

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  output: {
    path: path.resolve('./build/production/server-script'),
  },
  stats: 'errors-only',
});
