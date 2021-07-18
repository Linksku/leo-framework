const path = require('path');
const childProcess = require('child_process');
const webpack = require('webpack');

const ROOT = path.resolve('.');
const WEB_ROOT = path.resolve('./web');
const WEB_SRC_ROOT = path.resolve('./src/web');
const SERVER_ROOT = path.resolve('./server');
const SERVER_SRC_ROOT = path.resolve('./src/server');

const ENV_KEYS = [
  'SERVER',
  'DOMAIN_NAME',
  'PORT',
  'BASE_PATH',
  'TZ',
  'MYSQL_DB',
  'NOREPLY_EMAIL',
  'MOBILE_APP_ID',
  'APP_NAME',
  'APP_NAME_LOWER',
  'FB_APP_ID',
  'GA_ID',
  'SENTRY_DSN_WEB',
  'SENTRY_DSN_SERVER',
];

// todo: mid/hard memory usage.
module.exports = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        include: [
          WEB_ROOT,
          WEB_SRC_ROOT,
          SERVER_ROOT,
          SERVER_SRC_ROOT,
          path.resolve('./shared'),
          path.resolve('./src/shared'),
          path.resolve('./scripts'),
        ],
        exclude: [path.resolve('./node_modules')],
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [],
              cacheDirectory: true,
            },
          },
        ],
      },
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
      {
        test: /\.txt$/i,
        type: 'asset/source',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      ejs: 'ejs/ejs.min',
    },
  },
  optimization: {
    minimize: !!process.env.ANALYZER,
  },
  context: ROOT,
  plugins: [
    new webpack.EnvironmentPlugin({
      JS_VERSION: Number.parseInt(
        (childProcess.execSync('git rev-list --count master').toString()).trim(),
        10,
      ),
      SCRIPT_PATH: process.env.SCRIPT_PATH || '',
      ...ENV_KEYS.reduce((obj, k) => {
        obj[k] = process.env[k] || '';
        return obj;
      }, {}),
    }),
  ],
  cache: {
    type: 'memory',
  },
  stats: {
    optimizationBailout: true,
    logging: 'warn',
    // all: false,
  },
  devtool: false,
};