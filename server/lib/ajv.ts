import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

ajv.addKeyword({
  keyword: 'tsType',
  schemaType: 'string',
});

export default ajv;
