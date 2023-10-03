import Model from './Model';

class VirtualModel extends Model {
  static override isVirtual = true;

  static override cacheable = false;

  static override getReplicaTable(): string | null {
    return null;
  }

  static override idColumn: string;

  override getId() {
    // @ts-ignore model key
    return this[this.constructor.idColumn];
  }
}

export type VirtualModelClass = typeof VirtualModel;

export default VirtualModel;
