import isSchemaNullable from 'utils/models/isSchemaNullable';

export default async function selectRelated<
  T extends ModelClass,
  RelationName extends keyof ModelTypeToRelations<T['type']> & string
>(
  this: T,
  entity: ModelInstance<T>,
  name: RelationName,
): Promise<ModelTypeToRelations<T['type']>[RelationName]['tsType']> {
  const relation = this.relationsMap[name];
  if (!relation) {
    throw new Error(`${this.type}.selectRelated: relation "${name}" not found`);
  }

  const colVal = TS.assertType<string | number | null>(
    v => v === null || typeof v === 'string' || typeof v === 'number',
    TS.getProp(entity, relation.fromCol),
    new Error(`${this.type}.selectRelated: invalid fromCol "${relation.fromCol}"`),
  );

  if (relation.relationType === 'hasOne' || relation.relationType === 'belongsToOne') {
    if (colVal === null && isSchemaNullable(TS.getProp(this.schema, relation.fromCol))) {
      // @ts-ignore type comes from relation
      return null;
    }
    const result = await relation.toModel.selectOne({
      [relation.toCol]: colVal,
    });
    if (relation.relationType === 'belongsToOne' && !result) {
      throw new Error(`${this.type}.selectRelated: missing relation "${relation.name} for ${relation.toCol}=${colVal}`);
    }
    // @ts-ignore type comes from relation
    return result;
  }

  if (colVal === null) {
    throw new Error(`${this.type}.selectRelated: fromCol is null`);
  }

  if (relation.relationType === 'hasMany') {
    const results = await relation.toModel.selectAll({
      [relation.toCol]: colVal,
    });
    // @ts-ignore type comes from relation
    return results;
  }

  // Many to many
  const { through } = relation;
  if (!through) {
    throw new Error(`${this.type}.selectRelated: expected through for "${relation.name}"`);
  }
  const assocs = await through.model.selectAll({
    [through.from]: colVal,
  });
  const results = await Promise.all(
    assocs.flat().map(assoc => relation.toModel.selectAll({
      [relation.toCol]: TS.assertType<string | number>(
        v => typeof v === 'string' || typeof v === 'number',
        TS.getProp(assoc, through.to),
        new Error(`${this.type}.selectRelated: invalid through.to "${through.to}"`),
      ),
    })),
  );
  const resultsFlat = results.flat();
  // @ts-ignore type comes from relation
  return resultsFlat;
}
