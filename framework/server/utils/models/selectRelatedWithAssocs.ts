import isSchemaNullable from 'utils/models/isSchemaNullable';

async function selectNonNestedRelatedWithAssocs<T extends ModelClass>(
  Model: T,
  entity: ModelInstance<T>,
  name: string,
): Promise<{
  related: Model | Model[] | null,
  assocs: Model[],
}> {
  const relation = Model.relationsMap[name];
  if (!relation) {
    throw new Error(`${Model.type}.selectRelated: relation "${name}" not found`);
  }
  const { through } = relation;

  const colVal = TS.assertType<string | number | null>(
    v => v === null || typeof v === 'string' || typeof v === 'number',
    TS.getProp(entity, relation.fromCol),
    new Error(`${Model.type}.selectRelated: invalid fromCol "${relation.fromCol}"`),
  );

  if (colVal === null) {
    if ((relation.relationType === 'hasOne' || relation.relationType === 'belongsToOne')
      && isSchemaNullable(TS.getProp(Model.schema, relation.fromCol))) {
      return {
        related: null,
        assocs: [],
      };
    }
    throw new Error(`${Model.type}.selectRelated(${name}): unexpected null column value`);
  }

  let assocs: Model[] = [];
  let results: Model[];
  if (through) {
    assocs = await through.model.selectAll({
      [through.from]: colVal,
    }, { allowUnique: true });
    const resultsTemp = await Promise.all(assocs.map(
      assoc => relation.toModel.selectAll({
        [relation.toCol]: TS.assertType<string | number>(
          v => typeof v === 'string' || typeof v === 'number',
          TS.getProp(assoc, through.to),
          new Error(`${Model.type}.selectRelated(${name}): invalid through.to "${through.to}"`),
        ),
      }, { allowUnique: true }),
    ));
    results = resultsTemp.flat();
  } else {
    results = await relation.toModel.selectAll({
      [relation.toCol]: colVal,
    }, { allowUnique: true });
  }

  if (relation.relationType === 'hasOne' || relation.relationType === 'belongsToOne') {
    if (assocs.length > 1 || results.length > 1) {
      throw new Error(`${Model.type}.selectRelated(${name}): too many results`);
    }
    return {
      related: results[0],
      assocs,
    };
  }
  return {
    related: results,
    assocs,
  };
}

export default async function selectRelatedWithAssocs<
  T extends ModelClass,
  RelationName extends keyof ModelRelationTypes<T['type']> & string,
>(
  Model: T,
  entity: ModelInstance<T>,
  fullName: RelationName,
): Promise<{
  related: ModelRelationTypes<T['type']>[RelationName],
  assocs: Model[],
}> {
  const parts = fullName.split('.') as [RelationName, string?];
  // Only 2 levels deep to avoid expensive bugs.
  if (parts.length > 2) {
    throw new Error(`${Model.type}.selectRelatedWithAssocs: invalid relation "${fullName}"`);
  }
  const [name, nestedName] = parts;

  const { related, assocs } = await selectNonNestedRelatedWithAssocs(Model, entity, name);
  if (!nestedName || !related) {
    // @ts-ignore type comes from relation
    return { related, assocs };
  }

  if (Array.isArray(related)) {
    assocs.push(...related);

    const nestedRelated = await Promise.all(related.map(async ent => {
      const nested = await selectNonNestedRelatedWithAssocs(
        ent.constructor as ModelClass,
        ent,
        nestedName,
      );
      assocs.push(...nested.assocs);
      return nested.related as Model | Model[];
    }));

    // @ts-ignore type comes from relation
    return {
      related: nestedRelated.flat(),
      assocs,
    };
  }

  assocs.push(related as unknown as Model);

  const nested = await selectNonNestedRelatedWithAssocs(
    related.constructor as ModelClass,
    related,
    nestedName,
  );
  assocs.push(...nested.assocs);
  // @ts-ignore type comes from relation
  return {
    related: nested.related,
    assocs,
  };
}
