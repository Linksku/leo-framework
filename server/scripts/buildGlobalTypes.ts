import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

// @ts-ignore ignore import not found
import webGlobals from '../../web/config/globals.cjs';
// @ts-ignore ignore import not found
import webSrcGlobals from '../../src/web/config/globals.cjs';
// @ts-ignore ignore import not found
import serverGlobals from '../config/globals.cjs';
// @ts-ignore ignore import not found
import serverSrcGlobals from '../../src/server/config/globals.cjs';

const allGlobals = [
  [webGlobals, 'web/types/generated/globals.d.ts'],
  [webSrcGlobals, 'src/web/types/generated/globals.d.ts'],
  [serverGlobals, 'server/types/generated/globals.d.ts'],
  [serverSrcGlobals, 'src/server/types/generated/globals.d.ts'],
];

export default async function buildGlobalTypes() {
  for (const [globals, outFile] of allGlobals) {
    const imports: string[] = [];
    const declarations: string[] = [];

    for (const varName of Object.keys(globals)) {
      const v = globals[varName];
      let p = Array.isArray(v) ? v[0] : v;
      if (p.startsWith('./')) {
        p = `${Array.from({ length: outFile.split('/').length - 1 }, () => '../').join('')}${p.slice(2)}`;
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

    const out = `${imports.join('\n')}

declare global {
  ${declarations.join('\n  ')}
}
`;

    await mkdirp(path.dirname(path.resolve(outFile)));
    await fs.writeFile(path.resolve(outFile), out);
  }
}
