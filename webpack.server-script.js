import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays';
import baseConfig from './webpack.server.development';

export default mergeReplaceArrays(baseConfig, {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  output: {
    path: path.resolve('./build/development/server-script'),
  },
});
