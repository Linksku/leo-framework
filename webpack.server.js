import path from 'path';
import fs from 'fs';
import mapValues from 'lodash/mapValues.js';
import webpack from 'webpack';

import mergeReplaceArrays from './scripts/helpers/mergeReplaceArrays.js';
import globals from './framework/server/config/globals.cjs';
import appGlobals from './app/server/config/globals.cjs';
import sharedGlobals from './framework/shared/config/globals.cjs';
import appSharedGlobals from './app/shared/config/globals.cjs';
import baseConfig from './webpack.common.js';

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));

export default mergeReplaceArrays(baseConfig, {
  target: 'node',
  entry: {
    main: path.resolve('./framework/server/server.ts'),
  },
  output: {
    filename: 'main.js',
    chunkFormat: 'module',
    environment: {
      module: true,
    },
  },
  node: {
    __dirname: true,
  },
  module: {
    rules: [
      ...baseConfig.module.rules.map(rule => {
        if (rule.test.toString() === '/\\.(j|t)sx?$/') {
          return {
            ...rule,
            exclude: [
              path.resolve('./node_modules'),
              path.resolve('./framework/web'),
            ],
          };
        }
        return rule;
      }),
      {
        test: /(?:\.txt|\.json|\.ejs)$/,
        type: 'asset/source',
        exclude: [
          path.resolve('./node_modules'),
        ],
      },
    ],
  },
  plugins: [
    ...baseConfig.plugins,
    new webpack.ProvidePlugin(mapValues({
      ...sharedGlobals,
      ...appSharedGlobals,
      ...globals,
      ...appGlobals,
    }, v => {
      let p = Array.isArray(v) ? v[0] : v;
      if (p.startsWith('.')) {
        p = path.resolve(p);
      }
      return Array.isArray(v) ? [p, v[1]] : p;
    })),
    new webpack.EnvironmentPlugin({
      IS_SERVER_SCRIPT: !!process.env.SERVER_SCRIPT_PATH,
      SERVER_SCRIPT_PATH: process.env.SERVER_SCRIPT_PATH || '',
    }),
  ],
  externalsPresets: { node: true },
  externals: [
    // These packages have errors when bundled
    // Syncs with package.docker.json using build-docker-package-json.mjs
    Object.fromEntries(packageJson.externalDependences.map(dep => [dep, dep])),
  ],
  externalsType: 'module',
  experiments: {
    outputModule: true,
    topLevelAwait: true,
  },
});
