import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import baseConfig from './webpack.server.js';
import getTerserPlugin from './scripts/helpers/getTerserPlugin.js';

if (process.env.NODE_ENV !== 'production') {
  throw new Error('NODE_ENV isn\'t production');
}

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  output: {
    path: path.resolve('./build/production/server'),
  },
  optimization: {
    minimizer: [
      getTerserPlugin(),
    ],
  },
  devtool: 'source-map',
});
