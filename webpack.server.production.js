import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

import mergeReplaceArrays from './scripts/lib/mergeReplaceArrays';
import baseConfig from './webpack.server';
import transformWebpackCopied from './scripts/lib/transformWebpackCopied';

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  plugins: [
    ...baseConfig.plugins,
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./server/public'),
          to: path.resolve('./build/server'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./src/server/public'),
          to: path.resolve('./build/server'),
          transform: transformWebpackCopied,
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
});
