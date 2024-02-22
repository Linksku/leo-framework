import { getEntitiesState } from 'stores/EntitiesStore';
import useEntitiesByUniqueField from 'hooks/entities/useEntitiesByUniqueField';
import { API_TIMEOUT } from 'consts/server';
import useShallowMemoArr from 'hooks/useShallowMemoArr';
import useRelationConfig from 'hooks/entities/useRelationConfig';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import isDebug from 'utils/isDebug';
import useEntityByUniqueFields from './useEntityByUniqueFields';

const warnedRelations = new Set<string>();

function useCheckRelationExists(
  entityType: EntityType,
  entityId: Nullish<EntityId | EntityId[]>,
  entity: Entity | null,
  relationName: string,
) {
  const timerRef = useRef<number | undefined>();

  let isRouteVisible = true;
  let hadBeenActive = true;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isRouteVisible = useIsRouteVisible();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
  } catch {}

  const shouldCheck = hadBeenActive
    && isRouteVisible
    && entityId
    && entity
    && !entity.includedRelations?.some(r => r === relationName || r.startsWith(`${relationName}.`));
  const id = Array.isArray(entityId) ? entityId.join(',') : entityId;
  const key = `${entityType}, ${id}, ${relationName}`;
  const err = new Error(`useRelation(${key}): missing relation`);
  const checkRelationExists = useLatestCallback(() => {
    if (!shouldCheck || !id) {
      return;
    }

    const newEntity = getEntitiesState().get(entityType)?.get(id);
    if (!warnedRelations.has(key)) {
      if (newEntity && !newEntity.includedRelations?.some(
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

    timerRef.current = window.setTimeout(() => checkRelationExists(), API_TIMEOUT);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [shouldCheck, checkRelationExists]);
}

// todo: low/mid improve perf by removing useEntitiesByUniqueField
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
  const throughFromCol = relationConfig?.through?.from ?? 'ENTITY_FIELD_HACK';
  const throughFromVal = relationConfig && entity
    // @ts-ignore wontfix entity key
    && entity[relationConfig.fromCol];
  const throughEntity = useEntityByUniqueFields(
    relationConfig?.through?.model ?? null,
    useMemo(
      () => (throughFromVal
        ? {
          [throughFromCol]: throughFromVal,
        }
        : null),
      [throughFromCol, throughFromVal],
    ),
  );

  const relatedEntities = useEntitiesByUniqueField(
    relationConfig?.toModel ?? null,
    (relationConfig?.toCol ?? 'ENTITY_FIELD_HACK') as keyof Entity,
  );
  let related: Nullish<Stable<RelationType>>;
  if (!entity || !relationConfig) {
    related = null;
  } else if (relationConfig.through && throughEntity) {
    // @ts-ignore wontfix key error
    const toCol = throughEntity[relationConfig.through.to];
    related = (Array.isArray(toCol)
      ? toCol.map(col => relatedEntities.get(col))
      : relatedEntities.get(toCol)) as Stable<RelationType>;
  } else if (!relationConfig.through) {
    // @ts-ignore wontfix key error
    const fromCol = entity[
      relationConfig.fromCol
    ];
    related = (Array.isArray(fromCol)
      ? fromCol.map(col => relatedEntities.get(col))
      : relatedEntities.get(fromCol)) as Stable<RelationType>;
  } else {
    related = undefined;
  }

  const memoedArr = useShallowMemoArr(Array.isArray(related) ? related : null);
  return (memoedArr ?? related) as Stable<RelationType>;
}
