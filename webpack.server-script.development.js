import path from 'path';

import mergeReplaceArrays from './scripts/utils/mergeReplaceArrays';
import baseConfig from './webpack.server.development';

export default mergeReplaceArrays(baseConfig, {
  output: {
    path: path.resolve('./build/development/server-script'),
  },
});
