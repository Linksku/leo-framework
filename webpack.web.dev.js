const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const baseConfig = require('./webpack.web');

module.exports = mergeReplaceArrays(baseConfig, {
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
      chunkFilename: 'css/chunks/[name].css',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./web/public'),
          to: path.resolve('./build/web'),
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
