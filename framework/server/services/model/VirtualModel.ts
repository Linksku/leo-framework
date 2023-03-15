import knexRR from 'services/knex/knexRR';
import { getApiId } from 'utils/models/apiModelId';
import Model from './Model';

class VirtualModel extends Model {
  static override isVirtual = true;

  static override cacheable = false;

  static override getReplicaTable(): string | null {
    return null;
  }

  override getId(): ApiEntityId {
    return getApiId(this);
  }
}

VirtualModel.knex(knexRR);

export type VirtualModelClass = typeof VirtualModel;

export default VirtualModel;
