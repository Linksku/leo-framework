import type { JSONSchema4 } from 'json-schema';
import { compile } from 'json-schema-to-typescript';
import { promises as fs } from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import 'routes/apiRoutes';
import 'config/apis';
import { apis } from 'services/ApiManager';

export default async function buildApiTypes() {
  const paramsInterfaces = [] as string[];
  const dataInterfaces = [] as string[];

  for (const api of apis) {
    if (api.config.paramsSchema) {
      const fields = await compile(
        api.config.paramsSchema as JSONSchema4,
        'Foo',
        {
          bannerComment: '',
          unknownAny: false,
        },
      );
      paramsInterfaces.push(`interface ${api.handler.name[0].toUpperCase()}${api.handler.name.slice(1)}Params {
${fields.split('\n').slice(1, -2).join('\n').replace(/"/g, '\'')}
}
`);
    }

    if (api.config.dataSchema) {
      const fields = await compile(
        api.config.dataSchema as JSONSchema4,
        'Foo',
        {
          bannerComment: '',
          unknownAny: false,
        },
      );
      dataInterfaces.push(`interface ${api.handler.name[0].toUpperCase()}${api.handler.name.slice(1)}Data {
${fields.split('\n').slice(1, -2).join('\n').replace(/"/g, '\'')}
}
`);
    }
  }

  await mkdirp(path.resolve('./src/shared/types/generated'));
  await fs.writeFile(
    path.resolve('./src/shared/types/generated/api.d.ts'),
    `${paramsInterfaces.join('\n')}
${dataInterfaces.join('\n')}
type ApiNameToParams = {
${
  apis.map(
    a => `  '${a.config.name}': ${
      a.config.paramsSchema
        ? `${a.handler.name[0].toUpperCase()}${a.handler.name.slice(1)}Params`
        : 'undefined'
    },`,
  ).join('\n')
}
};

type ApiNameToData = {
${
  apis.map(
    a => `  '${a.config.name}': ${
      a.config.dataSchema
        ? `${a.handler.name[0].toUpperCase()}${a.handler.name.slice(1)}Data`
        : 'null'
    },`,
  ).join('\n')
}
};

type ApiName = '${apis.map(a => a.config.name).join(`'
  | '`)}';

type AuthApiName = '${apis.filter(a => a.config.auth).map(a => a.config.name).join(`'
| '`)}';
`,
  );
}
