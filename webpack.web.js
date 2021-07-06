const path = require('path');
const mapValues = require('lodash/mapValues');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const globals = require('./web/config/globals');
const globalsSrc = require('./src/web/config/globals');
const baseConfig = require('./webpack.common');
const transformWebpackCopied = require('./shared/lib/transformWebpackCopied');
const { ASSETS_URL } = require('./shared/settings');

module.exports = mergeReplaceArrays(baseConfig, {
  entry: {
    main: process.env.ANALYZER
      ? path.resolve('./web/bundleAnalyzerHack.js')
      : path.resolve('./web/web.tsx'),
  },
  output: {
    publicPath: `${ASSETS_URL}/`,
    // todo: high/mid separate dirs for prod and dev
    path: path.resolve('./build/web'),
    filename: 'js/[name].js',
    chunkFilename: `js/chunks/[name].js`,
  },
  plugins: [
    ...baseConfig.plugins,
    new webpack.ProvidePlugin(mapValues({ ...globals, ...globalsSrc }, v => {
      let p = Array.isArray(v) ? v[0] : v;
      if (p.startsWith('.')) {
        p = path.resolve(p);
      }

      return Array.isArray(v) ? [p, v[1]] : p;
    })),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./web/public'),
          to: path.resolve('./build/web'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./src/web/public'),
          to: path.resolve('./build/web'),
          transform: transformWebpackCopied,
        },
      ],
    }),
  ],
});
