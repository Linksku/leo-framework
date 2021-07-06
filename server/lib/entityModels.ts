import fs from 'fs';
import path from 'path';

const coreModels = fs.readdirSync(path.resolve('./server/models'));
coreModels.sort();
const srcModels = fs.readdirSync(path.resolve('./src/server/models'));
srcModels.sort();

const models: ObjectOf<EntityModel> = {};

for (const f of coreModels) {
  if (f.endsWith('.js') || f.endsWith('.ts')) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const EntityModel = require(`../models/${f}`).default;
    const entity = new EntityModel();
    models[entity.constructor.name] = EntityModel;
  }
}
for (const f of srcModels) {
  if (f.endsWith('.js') || f.endsWith('.ts')) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const EntityModel = require(`../../src/server/models/${f}`).default;
    const entity = new EntityModel();
    models[entity.constructor.name] = EntityModel;
  }
}

export default models;
