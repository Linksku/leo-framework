import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import baseConfig from './webpack.server.development.js';

export default mergeReplaceArrays(baseConfig, {
  mode: 'development',
  output: {
    path: path.resolve('./build/development/server-script'),
  },
});
