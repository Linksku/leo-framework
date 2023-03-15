import MaterializedView from './MaterializedView';

class InputMaterializedView extends MaterializedView {
  static BTClass: EntityClass;

  static insertOnly = false;
}

export type InputMaterializedViewClass = typeof InputMaterializedView;

export default InputMaterializedView;
