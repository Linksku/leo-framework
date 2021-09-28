import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

import mergeReplaceArrays from './scripts/lib/mergeReplaceArrays';
import baseConfig from './webpack.server';
import transformWebpackCopied from './scripts/lib/transformWebpackCopied';

export default mergeReplaceArrays(baseConfig, {
  mode: 'development',
  module: {
    rules: baseConfig.module.rules.map(rule => {
      if (rule.test.toString() === '/\\.(j|t)sx?$/') {
        return {
          ...rule,
          use: [
            'cache-loader',
            'thread-loader',
            ...rule.use,
          ],
        };
      }
      return rule;
    }),
  },
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
  devtool: 'cheap-module-source-map',
});
