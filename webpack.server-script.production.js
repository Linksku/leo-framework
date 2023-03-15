import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays';
import baseConfig from './webpack.server.production';

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  output: {
    path: path.resolve('./build/production/server-script'),
  },
});
