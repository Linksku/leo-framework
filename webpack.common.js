import path from 'path';
import childProcess from 'child_process';
import webpack from 'webpack';

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
  'MOBILE_APP_ID',
  'APP_NAME',
  'APP_NAME_LOWER',
  'FB_APP_ID',
  'GA_ID',
  'SENTRY_DSN_WEB',
  'SENTRY_DSN_SERVER',
];
const ENV_OBJ = {};
for (const k of ENV_KEYS) {
  ENV_OBJ[k] = process.env[k] || '';
}

// todo: mid/hard memory usage.
export default {
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        resolve: {
          // Allow importing without extensions.
          fullySpecified: false,
        },
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
        test: /\.txt$/i,
        type: 'asset/source',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.cjs'],
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
        childProcess.execSync('git rev-list --count master').toString().trim(),
        10,
      ),
      ...ENV_OBJ,
    }),
  ],
  stats: {
    optimizationBailout: true,
    logging: 'warn',
    // all: false,
  },
  devtool: false,
};
