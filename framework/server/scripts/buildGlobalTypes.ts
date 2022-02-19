import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

const webGlobals = require('../../web/config/globals.cjs');
const webAppGlobals = require('../../../app/web/config/globals.cjs');
const serverGlobals = require('../config/globals.cjs');
const serverAppGlobals = require('../../../app/server/config/globals.cjs');
const sharedGlobals = require('../../shared/config/globals.cjs');
const sharedAppGlobals = require('../../../app/shared/config/globals.cjs');

type GlobalsConfig = ObjectOf<string | string[]>;

const allGlobals: [GlobalsConfig, string][] = [
  [webGlobals, './framework/web/types/generated/globals.d.ts'],
  [{ ...webGlobals, ...webAppGlobals }, './app/web/types/generated/globals.d.ts'],
  [serverGlobals, './framework/server/types/generated/globals.d.ts'],
  [{ ...serverGlobals, ...serverAppGlobals }, './app/server/types/generated/globals.d.ts'],
  [sharedGlobals, './framework/shared/types/generated/globals.d.ts'],
  [{ ...sharedGlobals, ...sharedAppGlobals }, './app/shared/types/generated/globals.d.ts'],
];

export default async function buildGlobalTypes() {
  for (const [globals, outFile] of allGlobals) {
    const imports: string[] = [];
    const declarations: string[] = [];

    for (const [varName, v] of TS.objEntries(globals)) {
      let p = Array.isArray(v) ? v[0] : v;

      if (p.startsWith('./')) {
        p = path.relative(path.dirname(outFile), p);
      }

      if (Array.isArray(v)) {
        if (v.length !== 2) {
          throw new Error(`build-global-types: invalid value for ${varName}`);
        }
        imports.push(`import type { ${v[1]} as _${varName} } from '${p}';`);
      } else {
        imports.push(`import type _${varName} from '${p}';`);
      }
      declarations.push(`const ${varName}: typeof _${varName};`);
    }

    if (!declarations.length) {
      return;
    }

    const out = `${imports.join('\n')}

declare global {
  ${declarations.join('\n  ')}
}
`;

    await mkdirp(path.dirname(path.resolve(outFile)));
    await fs.writeFile(path.resolve(outFile), out);
  }
}
