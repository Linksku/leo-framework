import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import entityModels from 'lib/entityModels';

export default async function buildServerEntities() {
  const imports = [] as string[];
  const interfaces = [] as string[];

  for (const model of Object.keys(entityModels)) {
    imports.push(`import type _${model} from 'models/${model}';`);
    interfaces.push(`type ${model} = _${model};`, `type ${model}Model = typeof _${model};`);
  }

  await mkdirp(path.resolve('./src/server/types/generated'));
  await fs.writeFile(
    path.resolve('./src/server/types/generated/entities.d.ts'),
    `${imports.join('\n')}

declare global {
  ${interfaces.join('\n  ')}
}
`,
  );
}
