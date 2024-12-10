import {
  frameworkModels as _frameworkModels,
  appModels as _appModels,
} from 'config/__generated__/allModels';

export type ModelsArr = {
  type: ModelType,
  path: string,
  Model: ModelClass,
  isRR: boolean,
}[];

export const frameworkModels: ModelsArr = _frameworkModels;

export const appModels: ModelsArr = _appModels;

const appModelTypes = new Set(appModels.map(m => m.type));

export default [
  ...frameworkModels.filter(model => !appModelTypes.has(model.type)),
  ...appModels,
] as ModelsArr;
