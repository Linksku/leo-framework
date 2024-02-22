import { mergeEntityIncludedRelations } from 'utils/models/mergeEntityProps';

export default function includeRelatedEntities<Name extends ApiName>(
  ret: ApiRouteRet<Name>,
  allRelationNames: ApiAllRelations,
): void {
  const allEntities = [
    ...(ret.entities ?? []),
    ...(ret.createdEntities ?? []),
    ...(ret.updatedEntities ?? []),
  ];

  for (const ent of allEntities) {
    const relationNames = allRelationNames[(ent.constructor as ModelClass).type as RRModelType];
    if (!relationNames?.length) {
      continue;
    }

    const relationsSet = new Set<string>(relationNames);
    for (const relation of relationsSet) {
      const parts = relation.split('.');
      if (parts.length >= 2 && relationsSet.has(parts[0])) {
        relationsSet.delete(parts[0]);
      }
    }

    if (relationsSet.size) {
      if (ent.includedRelations) {
        ent.includedRelations = mergeEntityIncludedRelations(
          ent.includedRelations,
          relationsSet,
        );
      } else {
        Object.defineProperty(
          ent,
          'includedRelations',
          {
            value: mergeEntityIncludedRelations(
              ent.includedRelations,
              relationsSet,
            ),
            enumerable: false,
            writable: true,
            configurable: true,
          },
        );
      }
    }
  }
}
