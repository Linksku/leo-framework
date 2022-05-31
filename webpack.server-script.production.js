import path from 'path';

import mergeReplaceArrays from './scripts/utils/mergeReplaceArrays';
import baseConfig from './webpack.server.production';

export default mergeReplaceArrays(baseConfig, {
  output: {
    path: path.resolve('./build/production/server-script'),
  },
});
