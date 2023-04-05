import path from 'path';
import mapValues from 'lodash/mapValues';
import webpack from 'webpack';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays';
import globals from './framework/web/config/globals.cjs';
import globalsSrc from './app/web/config/globals.cjs';
import sharedGlobals from './framework/shared/config/globals.cjs';
import sharedGlobalsSrc from './app/shared/config/globals.cjs';
import baseConfig from './webpack.common';
import { ASSETS_URL } from './framework/shared/settings';

const WEB_ROOT = path.resolve('./framework/web');
const WEB_SRC_ROOT = path.resolve('./app/web');

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
            // todo: mid/hard atomic css
            loader: 'sass-loader',
            options: {
              sourceMap: false,
            },
          },
          {
            loader: 'sass-resources-loader',
            options: {
              resources: [
                path.resolve('./framework/web/styles/imports/modules.scss'),
                path.resolve('./framework/web/styles/imports/sassVariables.scss'),
                path.resolve('./framework/web/styles/imports/mixins.scss'),
                path.resolve('./framework/web/styles/imports/helpers.scss'),
              ],
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                      },
                    },
                  },
                  'removeDimensions',
                  {
                    name: 'removeAttrs',
                    params: {
                      attrs: [
                        'aria-hidden',
                        'data-prefix',
                        'data-icon',
                        'role',
                        'class',
                        'path:fill',
                      ],
                    },
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
    main: path.resolve('./framework/web/web.tsx'),
    sw: path.resolve('./framework/web/sw.ts'),
  },
  output: {
    publicPath: `${ASSETS_URL}/`,
    filename: 'js/[name].js',
    chunkFilename: 'js/chunks/[name].js',
  },
  plugins: [
    ...baseConfig.plugins,
    new webpack.ProvidePlugin(
      mapValues({
        ...sharedGlobals,
        ...sharedGlobalsSrc,
        ...globals,
        ...globalsSrc,
      },
      v => {
        let p = Array.isArray(v) ? v[0] : v;
        if (p.startsWith('.')) {
          p = path.resolve(p);
        }

        return Array.isArray(v) ? [p, v[1]] : p;
      }),
    ),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false,
        defaultVendors: false,
      },
    },
  },
});
