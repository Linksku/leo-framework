import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';

export default function validateNotUniquePartial<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): void {
  if (process.env.PRODUCTION) {
    return;
  }

  const uniqueIndex = getPartialUniqueIndex(Model, partial);
  if (uniqueIndex) {
    throw new Error(
      `validateNotUniquePartial: can't use unique partial for ${Model.type}: ${Object.keys(partial).join(',')}`,
    );
  }
}
