import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays';
import baseConfig from './webpack.server.development';

export default mergeReplaceArrays(baseConfig, {
  mode: 'development',
  output: {
    path: path.resolve('./build/development/server-script'),
  },
});
