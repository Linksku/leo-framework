import MaterializedView from './MaterializedView';

// todo: low/mid remove InputMaterializedView
class InputMaterializedView extends MaterializedView {
  static BTClass: EntityClass;
}

export type InputMaterializedViewClass = typeof InputMaterializedView;

export default InputMaterializedView;
