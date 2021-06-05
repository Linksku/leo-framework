import { promises as fs } from 'fs';
import path from 'path';

export default async function getModels() {
  const [filenames1, filenames2] = await Promise.all([
    fs.readdir(path.resolve('./server/models')),
    fs.readdir(path.resolve('./src/server/models')),
  ]);

  const models: ObjectOf<EntityModel> = {};
  for (const f of filenames1) {
    if (f.endsWith('.js') || f.endsWith('.ts')) {
      const { default: EntityModel } = await import(`../models/${f}`);
      const entity = new EntityModel();
      models[entity.constructor.name] = EntityModel;
    }
  }
  for (const f of filenames2) {
    if (f.endsWith('.js') || f.endsWith('.ts')) {
      const { default: EntityModel } = await import(`../../src/server/models/${f}`);
      const entity = new EntityModel();
      models[entity.constructor.name] = EntityModel;
    }
  }
  return models;
}
