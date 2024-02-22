export function hasNewIncludedRelations(
  oldRelations: Nullish<string[]>,
  newRelations: Nullish<string[]>,
) {
  if (!newRelations?.length) {
    return false;
  }
  if (!oldRelations?.length) {
    return true;
  }

  const oldRelationsSet = new Set(oldRelations);
  for (const newRelation of newRelations) {
    if (!oldRelationsSet.has(newRelation)) {
      return true;
    }
  }
  return false;
}

export function mergeEntityIncludedRelations(
  oldRelations: Nullish<string[] | Set<string>>,
  newRelations: Nullish<string[] | Set<string>>,
): string[] | undefined {
  if (!oldRelations) {
    return newRelations instanceof Set
      ? [...newRelations]
      : (newRelations ?? undefined);
  }
  if (!newRelations) {
    return oldRelations instanceof Set
      ? [...oldRelations]
      : (oldRelations ?? undefined);
  }

  return [...new Set([
    ...oldRelations,
    ...newRelations,
  ])];
}
