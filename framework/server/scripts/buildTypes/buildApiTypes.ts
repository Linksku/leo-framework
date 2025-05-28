import { promises as fs } from 'fs';
import path from 'path';
import type { JSONSchema4 } from 'json-schema';
import { compile } from 'json-schema-to-typescript';
import { mkdirp } from 'mkdirp';

import ucFirst from 'utils/ucFirst';
import 'routes/apis/apisRoute';
import { getApis } from 'services/ApiManager';
import { IMPORTED_TYPES } from './buildTypesConsts';

function validateSchema(apiName: string, schema: JSONSchema4) {
  const { required, properties } = schema;
  if (Array.isArray(required) && required.length) {
    if (!properties) {
      throw new Error(`buildApiTypes.validateSchema(${apiName}): missing properties`);
    }
    for (const key of required) {
      if (!properties[key]) {
        throw new Error(`buildApiTypes.validateSchema(${apiName}): invalid required "${key}"`);
      }
    }
  }
}

// todo: low/mid handle image field types
export default async function buildApiTypes() {
  const paramsInterfaces = [] as string[];
  const dataInterfaces = [] as string[];
  const apis = getApis();

  for (const api of apis) {
    if (!api.raw && api.config.paramsSchema) {
      validateSchema(api.config.name, api.config.paramsSchema);

      // eslint-disable-next-line no-await-in-loop
      const fields = await compile(
        api.config.paramsSchema as JSONSchema4,
        'Foo',
        {
          bannerComment: '',
          unknownAny: false,
          maxItems: 2,
        },
      );
      paramsInterfaces.push(`interface ${ucFirst(api.config.name)}ApiParams {
${fields.split('\n').slice(1, -2).join('\n').replaceAll('"', '\'')}
}
`);
    } else {
      paramsInterfaces.push(`interface ${ucFirst(api.config.name)}ApiParams {
}
`);
    }

    if (!api.raw && api.config.dataSchema) {
      validateSchema(api.config.name, api.config.dataSchema);

      // eslint-disable-next-line no-await-in-loop
      const fields = await compile(
        api.config.dataSchema as JSONSchema4,
        'Foo',
        {
          bannerComment: '',
          unknownAny: false,
        },
      );
      dataInterfaces.push(`interface ${ucFirst(api.config.name)}ApiData {
${fields.split('\n').slice(1, -2).join('\n').replaceAll('"', '\'')}
}
`);
    }
  }

  const content = `${IMPORTED_TYPES}

declare global {
${paramsInterfaces.join('\n')}
${dataInterfaces.join('\n')}
type ApiNameToParams = {
${
  apis.map(
    a => `  '${a.config.name}': ${ucFirst(a.config.name)}ApiParams,`,
  ).join('\n')
}
};

type ApiNameToData = {
${
  apis.map(
    a => `  '${a.config.name}': ${
      !a.raw && a.config.dataSchema
        ? `${ucFirst(a.config.name)}ApiData`
        : 'null'
    },`,
  ).join('\n')
}
};

type ApiName =
${apis.map(a => `  | '${a.config.name}'`).join('\n')};

type AuthApiName =
${apis.filter(a => a.config.auth).map(a => `  | '${a.config.name}'`).join('\n')};
}
`;

  // todo: low/mid only include default routes in default shared folder
  await mkdirp(path.resolve('./framework/shared/types/__generated__'));
  await fs.writeFile(
    path.resolve('./framework/shared/types/__generated__/api.d.ts'),
    content,
  );

  await mkdirp(path.resolve('./app/shared/types/__generated__'));
  await fs.writeFile(
    path.resolve('./app/shared/types/__generated__/api.d.ts'),
    content,
  );
}
