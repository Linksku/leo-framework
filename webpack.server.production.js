import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import baseConfig from './webpack.server.js';
import transformWebpackCopied from './scripts/helpers/transformWebpackCopied.js';
import getTerserPlugin from './scripts/helpers/getTerserPlugin.js';

if (process.env.NODE_ENV !== 'production') {
  throw new Error('NODE_ENV isn\'t production');
}

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  output: {
    path: path.resolve('./build/production/server'),
  },
  plugins: [
    ...baseConfig.plugins,
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./framework/server/public'),
          to: path.resolve('./build/production/server'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./app/server/public'),
          to: path.resolve('./build/production/server'),
          transform: transformWebpackCopied,
        },
      ],
    }),
  ],
  optimization: {
    minimizer: [
      getTerserPlugin(),
    ],
  },
});
