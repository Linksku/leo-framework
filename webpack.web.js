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

const WEB_ROOT = path.resolve('./web');
const WEB_SRC_ROOT = path.resolve('./src/web');

module.exports = mergeReplaceArrays(baseConfig, {
  module: {
    rules: [
      {
        test: /\.scss$/,
        include: [WEB_ROOT, WEB_SRC_ROOT],
        use: [
          {
            loader: 'css-loader',
            options: {
              importLoaders: 3,
              modules: {
                localIdentName: '[name]__[local]',
              },
            },
          },
          'postcss-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: false,
            },
          },
          {
            loader: 'sass-resources-loader',
            options: {
              resources: [
                path.resolve('./web/styles/imports/sassVariables.scss'),
                path.resolve('./web/styles/imports/mixins.scss'),
                path.resolve('./web/styles/imports/helpers.scss'),
              ],
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'react-svg-loader',
            options: {
              svgo: {
                plugins: [
                  {
                    removeDimensions: true,
                    removeViewBox: false,
                  },
                ],
              },
            },
          },
        ],
      },
      ...baseConfig.module.rules,
    ],
  },
  entry: {
    main: process.env.ANALYZER
      ? path.resolve('./web/bundleAnalyzerHack.js')
      : path.resolve('./web/web.tsx'),
  },
  output: {
    publicPath: `${ASSETS_URL}/`,
    // todo: low/mid separate dirs for prod and dev
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
