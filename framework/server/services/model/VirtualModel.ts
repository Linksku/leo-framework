import type { Knex } from 'knex';

import Model from './Model';

class VirtualModel extends Model {
  static override isVirtual = true;

  static override cacheable = false;

  static override getReplicaTable(): string | null {
    return null;
  }

  static override knex(..._args: any[]): Knex {
    throw new Error(`${this.type}.knex: no table for virtual model`);
  }

  static override idColumn: string;

  override getId() {
    // @ts-ignore model key
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this[this.constructor.idColumn];
  }
}

export type VirtualModelClass = typeof VirtualModel;

export default VirtualModel;
