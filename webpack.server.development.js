import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

import mergeReplaceArrays from './scripts/utils/mergeReplaceArrays';
import baseConfig from './webpack.server';
import transformWebpackCopied from './scripts/utils/transformWebpackCopied';

export default mergeReplaceArrays(baseConfig, {
  mode: 'development',
  output: {
    path: path.resolve('./build/development/server'),
  },
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
          from: path.resolve('./framework/server/public'),
          to: path.resolve('./build/development/server'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./app/server/public'),
          to: path.resolve('./build/development/server'),
          transform: transformWebpackCopied,
        },
      ],
    }),
  ],
  devtool: 'cheap-module-source-map',
});
