import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import getModels from 'lib/getModels';

export default async function buildServerEntities() {
  const imports = [] as string[];
  const declarations = [] as string[];

  const models = await getModels();
  for (const model of Object.keys(models)) {
    imports.push(`import type _${model} from 'models/${model}';`);
    declarations.push(`type ${model} = _${model};`, `type ${model}Model = typeof _${model};`);
  }

  await mkdirp(path.resolve('./src/server/types/generated'));
  await fs.writeFile(
    path.resolve('./src/server/types/generated/entities.d.ts'),
    `${imports.join('\n')}

declare global {
  ${declarations.join('\n  ')}
}
`,
  );
}
