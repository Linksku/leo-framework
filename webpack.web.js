const path = require('path');
const mapValues = require('lodash/mapValues');
const webpack = require('webpack');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const globals = require('./web/config/globals');
const globalsSrc = require('./src/web/config/globals');
const baseConfig = require('./webpack.common');

module.exports = mergeReplaceArrays(baseConfig, {
  entry: {
    main: process.env.ANALYZER
      ? path.resolve('./web/bundleAnalyzerHack.js')
      : path.resolve('./web/web.tsx'),
  },
  output: {
    path: path.resolve('./build/web'),
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
});
