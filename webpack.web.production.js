import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import childProcess from 'child_process';
import CopyPlugin from 'copy-webpack-plugin';

import mergeReplaceArrays from './scripts/utils/mergeReplaceArrays';
import transformWebpackCopied from './scripts/utils/transformWebpackCopied';
import baseConfig from './webpack.web';
import shortenCssClass from './scripts/shortenCssClass';

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

const jsVersion = Number.parseInt(
  childProcess.execSync('git rev-list --count master').toString().trim(),
  10,
);

export default mergeReplaceArrays(baseConfig, {
  entry: {
    '../sw': path.resolve('./framework/web/sw.ts'),
  },
  mode: 'production',
  output: {
    path: path.resolve('./build/production/web'),
    filename: `js/[name].${jsVersion}.js`,
    chunkFilename: `js/chunks/[name].${jsVersion}.js`,
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
      filename: `css/[name].${jsVersion}.css`,
      chunkFilename: `css/chunks/[name].${jsVersion}.css`,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./framework/web/public'),
          to: path.resolve('./build/production/web'),
          transform: transformWebpackCopied,
        },
        {
          from: path.resolve('./app/web/public'),
          to: path.resolve('./build/production/web'),
          transform: transformWebpackCopied,
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2017,
          module: true,
          compress: {
            passes: 2,
            // According to Vercel, these can cause bugs.
            comparisons: false,
            inline: 2,
          },
          output: {
            comments: false,
          },
        },
        extractComments: false,
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
