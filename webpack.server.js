const path = require('path');
const nodeExternals = require('webpack-node-externals');
const mapValues = require('lodash/mapValues');
const webpack = require('webpack');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const globals = require('./server/config/globals');
const globalsSrc = require('./src/server/config/globals');
const baseConfig = require('./webpack.common');

module.exports = mergeReplaceArrays(baseConfig, {
  target: 'node',
  entry: {
    main: path.resolve('./server/server.ts'),
  },
  output: {
    path: path.resolve('./build/server/'),
    filename: '[name].js',
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
  ],
  externals: [nodeExternals()],
});
