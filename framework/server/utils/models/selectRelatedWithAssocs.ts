import mapValues from 'lodash/mapValues.js';

import isSchemaNullable from 'utils/models/isSchemaNullable';
import { resolveRelationConst } from 'config/functions';
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
  seen: Map<string, Model[] | Promise<Model[]>>,
): Promise<Model[]> {
  const serializedConsts = consts ? Model.stringify(consts) : '';
  const key = `${Model.type},${col}=${Array.isArray(colVal) ? colVal.join(',') : colVal},${serializedConsts}`;
  if (!seen.has(key)) {
    seen.set(key, (async () => {
      if (Array.isArray(colVal)) {
        if (consts) {
          return Model.selectBulk(
            // @ts-expect-error wontfix entity keys
            colVal
              .map(val => ({
                ...consts,
                [col]: val,
              })),
          );
        }

        return Model.selectBulk(
          // @ts-expect-error wontfix entity keys
          colVal
            .map(val => ({ [col]: val })),
        );
      }

      if (!consts && Model.getUniqueSingleColumnsSet().has(col as ModelKey<ModelClass>)) {
        const ent = await Model.selectOne(
          // @ts-expect-error wontfix relation
          {
            [col]: colVal,
          },
        );
        return ent ? [ent] : [];
      }
      if (consts && isUniqueModelCols(Model, [col, ...TS.objKeys(consts)])) {
        const ent = await Model.selectOne(
          // @ts-expect-error wontfix relation
          {
            [col]: colVal,
            ...consts,
          },
        );
        return ent ? [ent] : [];
      }

      return Model.selectAll(
        // @ts-expect-error wontfix relation
        {
          [col]: colVal,
          ...consts,
        },
      );
    })());
  }

  return TS.defined(seen.get(key));
}

async function selectNonNestedRelatedWithAssocs<T extends ModelClass>(
  Model: T,
  entity: ModelInstance<T>,
  name: string,
  seen: Map<string, Model[] | Promise<Model[]>>,
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
      && isSchemaNullable(TS.defined(TS.getProp(Model.schema, fromCol)))) {
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
    const resolvedConsts = await promiseObj(
      mapValues<any, Promise<string | number | null | undefined>>(consts, resolveRelationConst),
    );
    for (const k of TS.objKeys(consts)) {
      // Temp hack, maybe add more validation
      const resolved = resolvedConsts[k];
      if (resolved === null) {
        // Null's probably not expected
        return {
          related: null,
          assocs: [],
        };
      }
      if (resolved !== undefined) {
        consts = {
          ...consts,
          [k]: resolved,
        };
        continue;
      }
    }
  }

  let assocs: Model[] = [];
  let results: Model[];
  if (through) {
    assocs = await getRelatedRows(through.model, through.from, colVal, null, seen);

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

      return getRelatedRows(toModel, toCol, toVal, consts, seen);
    }));

    results = resultsTemp.flat();
  } else {
    results = await getRelatedRows(toModel, toCol, colVal, consts, seen);
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

  const seen = new Map<string, Model[] | Promise<Model[]>>();
  const { related, assocs } = await selectNonNestedRelatedWithAssocs(
    Model,
    entity,
    name,
    seen,
  );
  if (!nestedName || !related
    || (Array.isArray(related) && !related.length)) {
    return { related, assocs };
  }

  if (!process.env.PRODUCTION) {
    const relatedArr = Array.isArray(related) ? related : [related];
    for (const ent of relatedArr) {
      Object.defineProperty(
        ent,
        'includedRelations',
        {
          value: [nestedName],
          enumerable: false,
          writable: true,
          configurable: true,
        },
      );
    }
  }

  if (Array.isArray(related)) {
    assocs.push(...related);

    const nested = await Promise.all(related.map(
      ent => selectNonNestedRelatedWithAssocs(
        ent.constructor as ModelClass,
        ent,
        nestedName,
        seen,
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
    seen,
  );
  assocs.push(...nested.assocs);
  return {
    related: nested.related,
    assocs,
  };
}
