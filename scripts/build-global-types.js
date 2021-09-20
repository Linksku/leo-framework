const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

if (process.argv.length !== 4) {
  throw new Error('Invalid args.');
}

const fileName = process.argv[2];
const outName = process.argv[3];
// eslint-disable-next-line import/no-dynamic-require
const globals = require(path.resolve(fileName));

const imports = [];
const declarations = [];

for (const varName of Object.keys(globals)) {
  const v = globals[varName];
  let p = Array.isArray(v) ? v[0] : v;
  if (p.startsWith('./')) {
    p = `${Array.from({ length: outName.split('/').length - 1 }, () => '../').join('')}${p.slice(2)}`;
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

(async () => {
  await mkdirp(path.dirname(path.resolve(outName)));
  await fs.promises.writeFile(path.resolve(outName), out);
})();
