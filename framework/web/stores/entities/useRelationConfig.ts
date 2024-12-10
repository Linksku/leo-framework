import { relationConfigsFamily } from 'stores/RelationsStore';

export default function useRelationConfig(entityType: EntityType, relationName: string) {
  return useAtomValue(relationConfigsFamily(`${entityType},${relationName}`));
}
