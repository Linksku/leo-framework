import equal from 'fast-deep-equal';

export function hasNewOrChangedExtras(
  oldMap?: ObjectOf<any>,
  newMap?: ObjectOf<any>,
): boolean {
  if (!newMap) {
    return false;
  }
  if (!oldMap) {
    return true;
  }

  for (const [k, newVal] of TS.objEntries(newMap)) {
    if (!TS.hasOwnProp(oldMap, k) || !equal(oldMap[k], newVal)) {
      return true;
    }
  }

  return false;
}

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

export function mergeEntityExtras(
  oldExtras: Nullish<ObjectOf<any>>,
  newExtras: Nullish<ObjectOf<any>>,
) {
  return {
    ...oldExtras,
    ...newExtras,
  };
}

export function mergeEntityIncludedRelations(
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
