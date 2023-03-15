import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import webGlobals from '../../../web/config/globals.cjs';
import webAppGlobals from '../../../../app/web/config/globals.cjs';
import serverGlobals from '../../config/globals.cjs';
import serverAppGlobals from '../../../../app/server/config/globals.cjs';
import sharedGlobals from '../../../shared/config/globals.cjs';
import sharedAppGlobals from '../../../../app/shared/config/globals.cjs';

type GlobalsConfig = ObjectOf<string | string[]>;

const allGlobals: [GlobalsConfig, string][] = [
  [webGlobals, './framework/web/types/__generated__/globals.d.ts'],
  [{ ...webGlobals, ...webAppGlobals }, './app/web/types/__generated__/globals.d.ts'],
  [serverGlobals, './framework/server/types/__generated__/globals.d.ts'],
  [{ ...serverGlobals, ...serverAppGlobals }, './app/server/types/__generated__/globals.d.ts'],
  [sharedGlobals, './framework/shared/types/__generated__/globals.d.ts'],
  [{ ...sharedGlobals, ...sharedAppGlobals }, './app/shared/types/__generated__/globals.d.ts'],
];

export default async function buildGlobalTypes() {
  for (const [globals, outFile] of allGlobals) {
    const imports: string[] = [];
    const declarations: string[] = [];

    for (const [varName, v] of TS.objEntries(globals)) {
      let p = Array.isArray(v) ? v[0] : v;
      if (p.startsWith('./framework/server/models/')
        || p.startsWith('./app/server/models/')) {
        // Model types are defined in models.d.ts
        continue;
      }

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
