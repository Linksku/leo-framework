import fastJsonStringify from 'fast-json-stringify';

import { AJV_OPTS } from 'services/getAjv';

export default function fastJson(schema: Parameters<typeof fastJsonStringify>[0]) {
  return fastJsonStringify(
    schema,
    {
      ajv: AJV_OPTS as Exclude<Parameters<typeof fastJsonStringify>[1], undefined>['ajv'],
    },
  );
}
