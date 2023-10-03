import isSchemaNullable from 'utils/models/isSchemaNullable';

export type RelatedResults = Promise<{
  related: Model | Model[] | null,
  assocs: Model[],
}>;

async function selectNonNestedRelatedWithAssocs<T extends ModelClass>(
  Model: T,
  entity: ModelInstance<T>,
  name: string,
): RelatedResults {
  const relation = Model.relationsMap[name];
  if (!relation) {
    throw new Error(`selectNonNestedRelatedWithAssocs(${Model.type}.${name}): : relation not found`);
  }
  const {
    relationType,
    fromCol,
    through,
    toModel,
    toCol,
  } = relation;

  const colVal = TS.getProp(entity, fromCol) as
    string | number | string[] | number[] | null;
  if (!process.env.PRODUCTION && !(
    colVal === null
    || typeof colVal === 'number'
    || typeof colVal === 'string'
    || (Array.isArray(colVal) && (
      (colVal as any[]).every(x => typeof x === 'string')
      || (colVal as any[]).every(x => typeof x === 'number')
    ))
  )) {
    throw new Error(
      `selectNonNestedRelatedWithAssocs(${Model.type}.${name}): invalid fromCol "${fromCol}"`,
    );
  }

  if (colVal === null) {
    if ((relationType === 'hasOne' || relationType === 'belongsToOne')
      && isSchemaNullable(TS.getProp(Model.schema, fromCol))) {
      return {
        related: null,
        assocs: [],
      };
    }
    throw new Error(
      `selectNonNestedRelatedWithAssocs(${Model.type}.${name}): unexpected null column value`,
    );
  }

  let assocs: Model[] = [];
  let results: Model[];
  if (through) {
    if (Array.isArray(colVal)) {
      assocs = await through.model.selectBulk(
        through.from as ModelKey<ModelClass>,
        colVal,
      );
    } else if (through.model.getUniqueColumnsSet().has(through.from as ModelKey<ModelClass>)) {
      const ent = await through.model.selectOne(
        // @ts-ignore wontfix relation
        {
          [through.from]: colVal,
        },
      );
      assocs = ent ? [ent] : [];
    } else {
      assocs = await through.model.selectAll(
        // @ts-ignore wontfix relation
        {
          [through.from]: colVal,
        },
      );
    }

    const resultsTemp = await Promise.all(assocs.map(async assoc => {
      const toVal = TS.getProp(assoc, through.to) as
        string | number | string[] | number[] | null;
      if (!process.env.PRODUCTION && !(
        toVal === null
        || typeof toVal === 'number'
        || typeof toVal === 'string'
        || (Array.isArray(toVal) && (
          (toVal as any[]).every(x => typeof x === 'string')
          || (toVal as any[]).every(x => typeof x === 'number')
        )))) {
        throw new Error(
          `selectNonNestedRelatedWithAssocs(${Model.type}.${name}): invalid through.to "${through.to}"`,
        );
      }

      if (Array.isArray(toVal)) {
        return toModel.selectBulk(
          toCol as ModelKey<ModelClass>,
          toVal,
        );
      }
      if (toModel.getUniqueColumnsSet().has(toCol as ModelKey<ModelClass>)) {
        const ent = await toModel.selectOne(
          // @ts-ignore wontfix relation
          {
            [toCol]: toVal,
          },
        );
        return ent ? [ent] : [];
      }
      return toModel.selectAll(
        // @ts-ignore wontfix relation
        {
          [toCol]: toVal,
        },
      );
    }));

    results = resultsTemp.flat();
  } else if (Array.isArray(colVal)) {
    results = await toModel.selectBulk(
      toCol as ModelKey<ModelClass>,
      colVal,
    );
  } else if (toModel.getUniqueColumnsSet().has(toCol as ModelKey<ModelClass>)) {
    const ent = await toModel.selectOne(
      // @ts-ignore wontfix relation
      {
        [toCol]: colVal,
      },
    );
    results = ent ? [ent] : [];
  } else {
    results = await toModel.selectAll(
      // @ts-ignore wontfix relation
      {
        [toCol]: colVal,
      },
    );
  }

  if (relationType === 'hasOne' || relationType === 'belongsToOne') {
    if (assocs.length > 1 || results.length > 1) {
      throw new Error(`selectNonNestedRelatedWithAssocs(${Model.type}.${name}): more than 1 result`);
    }
    return {
      related: results[0],
      assocs,
    };
  }

  if (!process.env.PRODUCTION && results.length > 100) {
    ErrorLogger.warn(new Error(
      `selectNonNestedRelatedWithAssocs(${Model.type}.${name}): too many results`,
    ));
  }
  return {
    related: results,
    assocs,
  };
}

export default async function selectRelatedWithAssocs<T extends ModelClass>(
  Model: T,
  entity: ModelInstance<T>,
  fullName: string,
): RelatedResults {
  const parts = fullName.split('.') as [string, string?];
  // Only 2 levels deep to avoid expensive bugs.
  if (parts.length > 2) {
    throw new Error(`selectRelatedWithAssocs(${Model.type}.${fullName}): invalid relation`);
  }
  const [name, nestedName] = parts;

  const { related, assocs } = await selectNonNestedRelatedWithAssocs(Model, entity, name);
  if (!nestedName || !related) {
    return { related, assocs };
  }

  if (Array.isArray(related)) {
    assocs.push(...related);

    const nested = await Promise.all(related.map(
      ent => selectNonNestedRelatedWithAssocs(
        ent.constructor as ModelClass,
        ent,
        nestedName,
      ),
    ));
    assocs.push(...nested.flatMap(n => n.assocs));
    return {
      related: TS.filterNulls(nested.flatMap(n => n.related)),
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
  return {
    related: nested.related,
    assocs,
  };
}
