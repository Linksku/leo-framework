import path from 'path';
import childProcess from 'child_process';
import webpack from 'webpack';

const ROOT = path.resolve('.');
const WEB_ROOT = path.resolve('./framework/web');
const WEB_SRC_ROOT = path.resolve('./app/web');
const SERVER_ROOT = path.resolve('./framework/server');
const SERVER_SRC_ROOT = path.resolve('./app/server');

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Webpack: env vars not set.');
}

const shouldMinimize = process.env.MINIMIZE != null
  ? !!process.env.MINIMIZE && process.env.MINIMIZE !== '0' && process.env.MINIMIZE !== 'false'
  : process.env.NODE_ENV === 'production';

export default {
  mode: /** @type {const} */ ('development'),
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
          path.resolve('./framework/shared'),
          path.resolve('./app/shared'),
          path.resolve('./framework/tests'),
          path.resolve('./app/tests'),
          path.resolve('./scripts'),
        ],
        exclude: [
          path.resolve('./node_modules'),
        ],
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
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.cjs'],
    alias: {
      // SVGR imports boxicons/node_modules/react
      react: path.resolve('./node_modules/react/index.js'),
    },
  },
  optimization: {
    minimize: shouldMinimize,
    concatenateModules: shouldMinimize,
  },
  context: ROOT,
  plugins: [
    new webpack.EnvironmentPlugin({
      JS_VERSION: Number.parseInt(
        childProcess.execSync('git rev-list --count master').toString().trim(),
        10,
      ),
      PRODUCTION: process.env.NODE_ENV === 'production',
      SERVER: process.env.SERVER,
    }),
  ],
  stats: process.env.ANALYZE_STATS
    // https://github.com/statoscope/statoscope/tree/master/packages/webpack-plugin#which-stats-flags-statoscope-use
    ? {
      all: false, // disable all the stats
      logging: /** @type {const} */ ('warn'),
      optimizationBailout: true,
      modules: true,
      hash: true, // compilation hash
      entrypoints: true, // entrypoints
      chunks: true, // chunks
      chunkModules: true, // modules
      reasons: true, // modules reasons
      ids: true, // IDs of modules and chunks (webpack 5)
      dependentModules: true, // dependent modules of chunks (webpack 5)
      chunkRelations: true, // chunk parents, children and siblings (webpack 5)
      cachedAssets: true, // information about the cached assets (webpack 5)
      nestedModules: true, // concatenated modules
      usedExports: true, // used exports
      providedExports: true, // provided imports
      assets: true, // assets
      timings: true, // modules timing information
      performance: true, // info about oversized assets
    }
    : /** @type {const} */ ('normal'),
  devtool: /** @type {const} */ (false),
  watchOptions: {
    aggregateTimeout: 50,
    ignored: '**/node_modules',
  },
};
