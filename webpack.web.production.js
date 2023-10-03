import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import childProcess from 'child_process';
import CopyPlugin from 'copy-webpack-plugin';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import transformWebpackCopied from './scripts/helpers/transformWebpackCopied.js';
import baseConfig from './webpack.web.js';
import shortenCssClass from './scripts/helpers/shortenCssClass.js';
import getTerserPlugin from './scripts/helpers/getTerserPlugin.js';

if (process.env.NODE_ENV !== 'production') {
  throw new Error('NODE_ENV isn\'t production');
}

const jsVersion = Number.parseInt(
  childProcess.execSync('git rev-list --count master').toString().trim(),
  10,
);

export default mergeReplaceArrays(baseConfig, {
  mode: 'production',
  output: {
    path: path.resolve('./build/production/web'),
    filename(pathData) {
      return pathData.chunk.name === 'sw'
        ? 'js/[name].js'
        : `js/[name].${jsVersion}.js`;
    },
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
                        getLocalIdent: shortenCssClass('./build/production/cssClasses'),
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
    minimizer: [
      getTerserPlugin(),
    ],
  },
  stats: {
    optimizationBailout: true,
  },
});
