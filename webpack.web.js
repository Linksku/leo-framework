const path = require('path');
const mapValues = require('lodash/mapValues');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const globals = require('./web/config/globals');
const globalsSrc = require('./src/web/config/globals');
const baseConfig = require('./webpack.common');

function transformCopied(content, absoluteFrom) {
  if (!['html', 'css', 'js', 'json', 'txt'].includes(absoluteFrom.replace(/^.+\./, ''))) {
    return content;
  }
  return content
    .toString()
    .replace(/%APP_NAME%/g, process.env.APP_NAME)
    .replace(/%BASE_PATH%/g, process.env.BASE_PATH);
}

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
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('./web/public'),
          to: path.resolve('./build/web'),
          transform: transformCopied,
        },
        {
          from: path.resolve('./src/web/public'),
          to: path.resolve('./build/web'),
          transform: transformCopied,
        },
      ],
    }),
  ],
});
