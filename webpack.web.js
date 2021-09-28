import path from 'path';
import mapValues from 'lodash/mapValues';
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';

import mergeReplaceArrays from './scripts/lib/mergeReplaceArrays';
import globals from './web/config/globals.cjs';
import globalsSrc from './src/web/config/globals.cjs';
import baseConfig from './webpack.common';
import transformWebpackCopied from './scripts/lib/transformWebpackCopied';
import { ASSETS_URL } from './shared/settings';

const WEB_ROOT = path.resolve('./web');
const WEB_SRC_ROOT = path.resolve('./src/web');

export default mergeReplaceArrays(baseConfig, {
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
      ? path.resolve('./web/bundleAnalyzerHack.ts')
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
