export function mergeEntityExtras(
  oldExtras: Nullish<ObjectOf<any>>,
  newExtras: Nullish<ObjectOf<any>>,
) {
  return {
    ...oldExtras,
    ...newExtras,
  };
}

export function mergeEntityDevRelations(
  oldRelations: Nullish<string[]>,
  newRelations: Nullish<string[]>,
) {
  if (!oldRelations) {
    return newRelations ?? undefined;
  }
  if (!newRelations) {
    return oldRelations ?? undefined;
  }
  return [...new Set([
    ...oldRelations,
    ...newRelations,
  ])];
}
