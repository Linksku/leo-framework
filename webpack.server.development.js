import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import nodeExternals from 'webpack-node-externals';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays';
import baseConfig from './webpack.server';
import transformWebpackCopied from './scripts/helpers/transformWebpackCopied';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('NODE_ENV isn\'t development');
}

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
  externals: [
    ...baseConfig.externals,
    nodeExternals({
      importType: 'module',
    }),
  ],
  devtool: 'cheap-module-source-map',
});
