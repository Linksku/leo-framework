export default function filterEntityToUniqueKey<T extends EntityModel>(
  key: InstanceKey<T> | InstanceKey<T>[],
  partial: Partial<InstanceType<T>>,
): Partial<InstanceType<T>> {
  if (Array.isArray(key)) {
    if (key.length === Object.keys(partial).length) {
      return partial;
    }

    const newPartial = {} as Partial<InstanceType<T>>;
    for (const k of key) {
      newPartial[k] = partial[k];
    }
    return newPartial;
  }

  return { [key]: partial[key] } as Partial<InstanceType<T>>;
}
