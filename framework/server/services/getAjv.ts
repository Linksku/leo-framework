import Ajv, { Options } from 'ajv';
import { fullFormats } from 'ajv-formats/dist/formats.js';
import instanceofKeyword from 'ajv-keywords/dist/definitions/instanceof.js';

import { HTTP_URL_REGEX } from 'consts/browsers';

export const AJV_OPTS = {
  formats: {
    ...fullFormats,
    'http-url': HTTP_URL_REGEX,
  },
  keywords: [
    {
      keyword: 'tsType',
      schemaType: 'string',
    },
    {
      keyword: 'maxPrecision',
      type: 'number',
      compile(precision) {
        return data => {
          const str = `${data}`;
          const decimal = str.split('.')[1];
          return !decimal || decimal.length <= precision;
        };
      },
      errors: false,
      metaSchema: {
        type: 'number',
      },
    },
    instanceofKeyword(),
  ],
} satisfies Options;

let ajv: Ajv | undefined;

export default function getAjv(): Ajv {
  if (ajv) {
    return ajv;
  }

  ajv = new Ajv(AJV_OPTS);
  return ajv;
}
