import path from 'path';
import nodeExternals from 'webpack-node-externals';
import mapValues from 'lodash/mapValues';
import webpack from 'webpack';

import mergeReplaceArrays from './scripts/lib/mergeReplaceArrays';
import globals from './server/config/globals.cjs';
import globalsSrc from './src/server/config/globals.cjs';
import baseConfig from './webpack.common';

export default mergeReplaceArrays(baseConfig, {
  target: 'node',
  entry: {
    main: path.resolve('./server/server.ts'),
  },
  output: {
    path: path.resolve('./build/server'),
    filename: '[name].js',
    chunkFormat: 'module',
    environment: {
      module: true,
    },
  },
  node: {
    __dirname: true,
  },
  module: {
    rules: baseConfig.module.rules.map(rule => {
      if (rule.test.toString() === '/\\.(j|t)sx?$/') {
        return {
          ...rule,
          exclude: [
            path.resolve('./node_modules'),
            path.resolve('./web'),
          ],
        };
      }
      if (rule.test.toString() === '/\\.scss$/') {
        return {
          ...rule,
          use: ['isomorphic-style-loader', ...rule.use],
        };
      }
      return rule;
    }),
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
    new webpack.EnvironmentPlugin({
      SCRIPT_PATH: process.env.SCRIPT_PATH || '',
      IS_SERVER_SCRIPT: !!process.env.SCRIPT_PATH,
    }),
  ],
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      importType: 'module',
    }),
  ],
  experiments: {
    outputModule: true,
    topLevelAwait: true,
  },
  externalsType: 'module',
});
