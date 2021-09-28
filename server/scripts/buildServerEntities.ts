import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import defaultModels from 'models/defaultModels';
import srcModels from 'config/models';

function getOutput(models: ObjectOf<EntityModel>) {
  const imports = [] as string[];
  const interfaces = [] as string[];

  for (const model of Object.keys(models)) {
    imports.push(`import type _${model} from 'models/${model}';`);
    interfaces.push(`type ${model} = _${model};`, `type ${model}Model = typeof _${model};`);
  }

  return `${imports.join('\n')}

declare global {
  ${interfaces.join('\n  ')}
}
  `;
}

export default async function buildServerEntities() {
  await mkdirp(path.resolve('./server/types/generated'));
  await fs.writeFile(
    path.resolve('./server/types/generated/entities.d.ts'),
    getOutput(defaultModels),
  );

  await mkdirp(path.resolve('./src/server/types/generated'));
  await fs.writeFile(
    path.resolve('./src/server/types/generated/entities.d.ts'),
    getOutput(srcModels),
  );
}
