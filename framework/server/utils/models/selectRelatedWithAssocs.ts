import isSchemaNullable from 'utils/models/isSchemaNullable';
import isUniqueModelCols from './isUniqueModelCols';

export type RelatedResults = Promise<{
  related: Model | Model[] | null,
  assocs: Model[],
}>;

async function getRelatedRows(
  Model: ModelClass,
  col: string,
  colVal: string | number | string[] | number[] | null,
  consts: Nullish<ObjectOf<string | number | null>>,
): Promise<Model[]> {
  if (Array.isArray(colVal)) {
    if (consts) {
      return Model.selectBulk(
        [col, ...TS.objKeys(consts)] as ModelKey<ModelClass>[],
        colVal.map(val => [val, ...TS.objValues(consts)]),
      );
    }

    return Model.selectBulk(
      col as ModelKey<ModelClass>,
      colVal,
    );
  }

  if (!consts && Model.getUniqueSingleColumnsSet().has(col as ModelKey<ModelClass>)) {
    const ent = await Model.selectOne(
      // @ts-ignore wontfix relation
      {
        [col]: colVal,
      },
    );
    return ent ? [ent] : [];
  }
  if (consts && isUniqueModelCols(Model, [col, ...TS.objKeys(consts)])) {
    const ent = await Model.selectOne(
      // @ts-ignore wontfix relation
      {
        [col]: colVal,
        ...consts,
      },
    );
    return ent ? [ent] : [];
  }

  return Model.selectAll(
    // @ts-ignore wontfix relation
    {
      [col]: colVal,
      ...consts,
    },
  );
}

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
    throw getErr(
      `selectNonNestedRelatedWithAssocs(${Model.type}.${name}): invalid fromCol "${fromCol}"`,
      { colVal },
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

  let consts = relation.consts as Nullish<ObjectOf<string | number | null>>;
  if (consts) {
    for (const [k, v] of TS.objEntries(consts)) {
      // Temp hack, maybe add more validation
      if (v === 'currentUserId') {
        const rc = getRC();
        if (!rc?.currentUserId) {
          return {
            related: null,
            assocs: [],
          };
        }

        consts = {
          ...consts,
          [k]: rc?.currentUserId ?? null,
        };
        break;
      }
    }
  }

  let assocs: Model[] = [];
  let results: Model[];
  if (through) {
    assocs = await getRelatedRows(through.model, through.from, colVal, null);

    const resultsTemp = await Promise.all(assocs.map(async assoc => {
      const toVal = TS.getProp(
        assoc,
        through.to,
      ) as string | number | string[] | number[] | null;
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

      return getRelatedRows(toModel, toCol, toVal, consts);
    }));

    results = resultsTemp.flat();
  } else {
    results = await getRelatedRows(toModel, toCol, colVal, consts);
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
  if (!nestedName || !related
    || (Array.isArray(related) && !related.length)) {
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
