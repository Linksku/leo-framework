const mergeReplaceArrays = require('./shared/lib/mergeReplaceArrays');
const baseConfig = require('./webpack.server');

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

module.exports = mergeReplaceArrays(baseConfig, {
  mode: 'production',
  optimization: {
    minimize: true,
  },
});
