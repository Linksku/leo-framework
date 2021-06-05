const path = require('path');
const childProcess = require('child_process');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const baseConfig = require('./webpack.web');
const shortenCssClass = require('./scripts/shortenCssClass');

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

const JS_VERSION = Number.parseInt(
  (childProcess.execSync('cd src; git rev-list --count master; cd ..').toString()).trim(),
  10,
);

module.exports = mergeReplaceArrays(baseConfig, {
  entry: {
    '../sw': path.resolve('./web/sw.ts'),
  },
  mode: 'production',
  output: {
    chunkFilename: `js/chunks/[name].${JS_VERSION}.js`,
  },
  module: {
    rules: baseConfig.module.rules.map(rule => {
      if (rule.test.toString() === '/\\.(j|t)sx?$/') {
        return {
          ...rule,
          exclude: [],
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
            ...rule.use.map(use => {
              if (use.loader === 'css-loader') {
                return mergeReplaceArrays(
                  use,
                  {
                    options: {
                      modules: {
                        getLocalIdent: shortenCssClass,
                      },
                    },
                  },
                );
              }
              return use;
            }),
          ],
        };
      }
      return rule;
    }),
  },
  plugins: [
    ...baseConfig.plugins,
    new MiniCssExtractPlugin({
      filename: `css/[name].css`,
      chunkFilename: `css/chunks/[name].${JS_VERSION}.css`,
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 6,
          module: true,
          compress: {
            passes: 2,
          },
          output: {
            comments: false,
          },
        },
      }),
    ],
    splitChunks: {
      cacheGroups: {
        default: false,
        defaultVendors: false,
      },
    },
  },
  stats: {
    optimizationBailout: true,
  },
});
