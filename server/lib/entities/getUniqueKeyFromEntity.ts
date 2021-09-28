export default function getUniqueKeyFromEntity<T extends EntityModel>(
  Model: T,
  partial: Partial<InstanceType<T>>,
): InstanceKey<T> | InstanceKey<T>[] | null {
  for (const key of Model.getUniqueProperties()) {
    if (!Array.isArray(key) && partial[key]) {
      return key;
    }
  }

  for (const key of Model.getUniqueProperties()) {
    if (Array.isArray(key) && key.every(k => partial[k])) {
      return key;
    }
  }

  return null;
}
