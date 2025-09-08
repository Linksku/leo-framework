#!/usr/bin/env zx

import { $, fs, path } from 'zx';

const startTime = new Date(Date.now() - (60 * 1000));

// Create generated config files
async function writeGenerated(dir) {
  await $`mkdir -p ${dir}`;
  fs.writeFileSync(
    path.join(dir, 'allModels.ts'),
    'export const frameworkModels = [];\nexport const appModels = [];\n',
  );
  fs.writeFileSync(
    path.join(dir, 'allModels.cjs'),
    'module.exports = {\n  frameworkModels: [],\n  appModels: [],\n};\n',
  );
  fs.writeFileSync(
    path.join(dir, 'consts.ts'),
    'export const HAS_MVS = false;\n',
  );
}

await writeGenerated('./framework/server/config/__generated__');
await writeGenerated('./app/server/config/__generated__');

// Move globals.d.ts → globals-old.d.ts
const globalsPaths = [
  './framework/web/types/__generated__/globals.d.ts',
  './app/web/types/__generated__/globals.d.ts',
  './framework/server/types/__generated__/globals.d.ts',
  './app/server/types/__generated__/globals.d.ts',
  './framework/shared/types/__generated__/globals.d.ts',
  './app/shared/types/__generated__/globals.d.ts',
];
for (const file of globalsPaths) {
  if (fs.existsSync(file)) {
    await $`mv ${file} ${file.replace('globals.d.ts', 'globals-old.d.ts')}`;
  }
}

// Build models and types
try {
  await $`yarn ss buildModels`;
  await $`yarn ss buildTypes`;
} catch {
  console.error('buildModels or buildTypes failed');
  process.exit(1);
}

// Delete files older than startTime in generated type dirs
const typeDirs = [
  'framework/web/types/__generated__',
  'app/web/types/__generated__',
  'framework/server/types/__generated__',
  'app/server/types/__generated__',
  'framework/shared/types/__generated__',
  'app/shared/types/__generated__',
];

for (const dir of typeDirs) {
  if (!fs.existsSync(dir)) {
    continue;
  }
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.mtime < startTime) {
      fs.rmSync(fullPath, { force: true, recursive: true });
    }
  }
}

// Remove old globals-old.d.ts files
for (const file of globalsPaths.map(p => p.replace('globals.d.ts', 'globals-old.d.ts'))) {
  fs.rmSync(file, { force: true });
}
