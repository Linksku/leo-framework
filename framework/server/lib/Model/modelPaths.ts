import path from 'path';

import readdirRecursiveSync from 'lib/readdirRecursiveSync';

export const appModelPaths = readdirRecursiveSync(path.resolve('./app/server/models'))
  .filter(f => f.endsWith('.ts') && !f.endsWith('Mixin.ts'))
  .map(f => `app/server/models/${f}`);

export const frameworkModelPaths = readdirRecursiveSync(path.resolve('./framework/server/models'))
  .filter(f => f.endsWith('.ts') && !f.endsWith('Mixin.ts'))
  .map(f => `framework/server/models/${f}`);

export default [
  ...appModelPaths,
  ...frameworkModelPaths.filter(f => {
    const temp = f.replace('framework/server/models/', '');
    return !appModelPaths.includes(`app/server/models/${temp}`);
  }),
]
  .sort();
