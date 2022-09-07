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
    const relationNames = allRelationNames[(ent.constructor as ModelClass).type];
    if (!relationNames?.length) {
      continue;
    }

    TS.objValOrSetDefault(ent, 'includedRelations', [])
      .push(...relationNames);
  }
}
