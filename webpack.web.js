import path from 'path';
import mapValues from 'lodash/mapValues.js';
import webpack from 'webpack';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import globals from './framework/web/config/globals.cjs';
import globalsSrc from './app/web/config/globals.cjs';
import sharedGlobals from './framework/shared/config/globals.cjs';
import sharedGlobalsSrc from './app/shared/config/globals.cjs';
import baseConfig from './webpack.common.js';
import { ASSETS_URL } from './framework/shared/consts/server.js';

const WEB_ROOT = path.resolve('./framework/web');
const WEB_SRC_ROOT = path.resolve('./app/web');

const svgrLoader = {
  loader: '@svgr/webpack',
  options: {
    svgoConfig: {
      plugins: [
        // {
        //   name: 'preset-default',
        //   params: {
        //     overrides: {
        //       removeViewBox: false,
        //     },
        //   },
        // },
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
            ],
          },
        },
      ],
    },
  },
};

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
                namedExport: false,
                // Handled in shortenCssClass for prod
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
        test: /\/(svgs|boxicons)\/.+\.svg$/,
        use: [mergeReplaceArrays(svgrLoader, {
          options: {
            svgoConfig: {
              plugins: svgrLoader.options.svgoConfig.plugins.map(plugin => {
                if (typeof plugin === 'object' && plugin.name === 'removeAttrs') {
                  return {
                    ...plugin,
                    params: {
                      attrs: [
                        ...plugin.params.attrs,
                        'path:fill',
                      ],
                    },
                  };
                }
                return plugin;
              }),
            },
          },
        })],
      },
      {
        test: /\.svg$/,
        exclude: /\/(svgs|boxicons)\/.+\.svg$/,
        use: [svgrLoader],
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
