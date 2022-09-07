import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';

export default function validateUniquePartial<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): void {
  if (process.env.PRODUCTION) {
    return;
  }

  const entries = TS.objEntries(partial);
  const uniqueIndex = getPartialUniqueIndex(Model, partial);
  if (!uniqueIndex) {
    throw new Error(`validateUniquePartial: no unique index for ${Model.type}: ${entries.map(e => e[0]).join(',')}`);
  }

  for (const [key, val] of entries) {
    const type = Model.getSchema()[key]?.type;
    // todo: low/easy allow nullable unique partial values
    if ((type === 'string' && typeof val !== 'string')
      || ((type === 'number' || type === 'integer') && typeof val !== 'number')) {
      throw new Error(`validateUniquePartial: ${Model.type} ${key}=${val} (${typeof val}) doesn't match schema (${type}).`);
    }
  }
}