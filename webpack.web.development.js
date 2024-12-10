import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import transformWebpackCopied from './scripts/helpers/transformWebpackCopied.js';
import baseConfig from './webpack.web.js';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('NODE_ENV isn\'t development');
}

export default mergeReplaceArrays(baseConfig, {
  mode: 'development',
  output: {
    path: path.resolve('./build/development/web'),
    filename: 'js/[name].js',
    chunkFilename: 'js/chunks/[name].[chunkhash].js',
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
      if (rule.test.toString() === '/\\.scss$/') {
        return {
          ...rule,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                esModule: true,
                defaultExport: true,
              },
            },
            'cache-loader',
            ...rule.use,
          ],
        };
      }
      return rule;
    }),
  },
  plugins: [
    ...baseConfig.plugins,
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: 'css/chunks/[name].[chunkhash].css',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./framework/web/public'),
          to: path.resolve('./build/development/web'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./app/web/public'),
          to: path.resolve('./build/development/web'),
          transform: transformWebpackCopied,
        },
      ],
    }),
    // Limiting to 1 chunk is slower.
  ],
  watchOptions: {
    aggregateTimeout: 0,
  },
  devtool: 'cheap-module-source-map',
});
