import { EntitiesIncludedRelations, getEntitiesState } from 'stores/entities/EntitiesStore';
import useEntitiesMap from 'stores/entities/useEntitiesMap';
import useEntityByUniqueFields from 'stores/entities/useEntityByUniqueFields';
import { DEFAULT_API_TIMEOUT } from 'consts/server';
import useShallowMemoArr from 'utils/useShallowMemoArr';
import { useRelationConfig } from 'stores/RelationsStore';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import isDebug from 'utils/isDebug';

const warnedRelations = new Set<string>();

function useCheckRelationExists(
  entityType: EntityType,
  entityId: Nullish<EntityId | EntityId[]>,
  entity: Entity | null,
  relationName: string,
) {
  const timerRef = useRef<number | undefined>(undefined);

  const isRouteVisible = useIsRouteVisible(true) ?? true;
  const hadBeenActive = useHadRouteBeenActive(true) ?? true;

  const shouldCheck = hadBeenActive
    && isRouteVisible
    && entityId
    && entity
    && !EntitiesIncludedRelations.get(entity.type)?.get(entity.id)
      ?.some(r => r === relationName || r.startsWith(`${relationName}.`));
  const id = Array.isArray(entityId) ? entityId.join(',') : entityId;
  const key = `${entityType}, ${id}, ${relationName}`;
  const err = new Error(`useRelation(${key}): missing relation`);
  const checkRelationExists = useLatestCallback(() => {
    if (!shouldCheck || !id) {
      return;
    }

    const newEntity = getEntitiesState().get(entityType)?.get(id);
    if (!warnedRelations.has(key)) {
      if (newEntity && !EntitiesIncludedRelations.get(entity.type)?.get(entity.id)?.some(
        r => r === relationName || r.startsWith(`${relationName}.`),
      )) {
        ErrorLogger.warn(err);
      }
      warnedRelations.add(key);
    }
  });

  useEffect(() => {
    if (!shouldCheck) {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => checkRelationExists(), DEFAULT_API_TIMEOUT);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [shouldCheck, checkRelationExists]);
}

// todo: low/med improve perf by removing useEntitiesMapByField
export default function useRelation<
  T extends EntityType,
  RelationName extends string & keyof EntityRelationTypes[T],
  RelationType extends Defined<EntityRelationTypes[T][RelationName]>,
>(
  entityType: T,
  entityId: Nullish<EntityId | EntityId[]>,
  relationName: RelationName,
): Nullish<Stable<RelationType>> {
  const entity = useEntity(entityType, entityId);
  const relationConfig = useRelationConfig(entityType, relationName);

  if (!process.env.PRODUCTION && isDebug) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCheckRelationExists(
      entityType,
      entityId,
      entity,
      relationName,
    );
  }

  // Note: this doesn't support anything but 1:1 yet
  const throughFromCol = relationConfig?.through?.from;
  const throughFromVal = relationConfig && entity
    // @ts-expect-error wontfix entity key
    && entity[relationConfig.fromCol];
  const throughEntity = useEntityByUniqueFields(
    relationConfig?.through?.model ?? null,
    useMemo(
      () => (throughFromCol && throughFromVal
        ? {
          [throughFromCol]: throughFromVal,
        }
        : null),
      [throughFromCol, throughFromVal],
    ),
  );

  let relatedColVals: Stable<(string | number)[]> | string | number | null = null;
  if (entity && relationConfig) {
    if (relationConfig.through && throughEntity) {
      // @ts-expect-error wontfix entity key
      relatedColVals = throughEntity[
        relationConfig.through.to
      ];
    } else if (!relationConfig.through) {
      // @ts-expect-error wontfix entity key
      relatedColVals = entity[
        relationConfig.fromCol
      ];
    }
  }
  const relatedEntitiesMap = useEntitiesMap(
    Array.isArray(relatedColVals)
      ? (relationConfig?.toModel ?? null)
      : null,
    [(relationConfig?.toCol ?? 'ENTITY_FIELD_HACK') as keyof Entity],
  );
  const relatedEntity = useEntityByUniqueFields(
    !relatedColVals || Array.isArray(relatedColVals)
      ? null
      : (relationConfig?.toModel ?? null),
    useMemo(
      () => (relationConfig && relatedColVals && !Array.isArray(relatedColVals)
        ? {
          [relationConfig.toCol]: relatedColVals,
        }
        : null),
      [relatedColVals, relationConfig],
    ),
  );

  const related = Array.isArray(relatedColVals)
    ? relatedColVals.map(col => relatedEntitiesMap.get(col)?.[0])
    : relatedEntity;
  const memoedArr = useShallowMemoArr(Array.isArray(related) ? related : null);
  return (memoedArr ?? related) as Stable<RelationType>;
}
