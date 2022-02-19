import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import addKeywords from 'ajv-keywords';

const ajv = new Ajv();

addFormats(ajv);
addKeywords(ajv, 'instanceof');

ajv.addKeyword({
  keyword: 'tsType',
  schemaType: 'string',
});

ajv.addKeyword({
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
});

export default ajv;
