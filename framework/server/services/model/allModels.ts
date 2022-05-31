import { frameworkModels as _frameworkModels, appModels as _appModels } from 'config/__generated__/allModels';

export type ModelsArr = {
  type: ModelType,
  path: string,
  Model: ModelClass,
  replicaTable: string | null,
}[];

export const frameworkModels: ModelsArr = _frameworkModels;

export const appModels: ModelsArr = _appModels;

export default [
  ...frameworkModels.filter(model => !appModels.some(m => m.type === model.type)),
  ...appModels,
];
