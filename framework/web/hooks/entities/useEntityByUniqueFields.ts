import useMemoWithState from 'hooks/useMemoWithState';
import isDebug from 'utils/isDebug';
import useAllEntities from './useAllEntities';
import useCheckEntityExists from './useCheckEntityExists';
import useGetEntitiesByUniqueFields from './useGetEntitiesByUniqueFields';

export default function useEntityByUniqueFields<
  T extends EntityType | null,
  Fields,
>(
  type: T,
  fields: T extends EntityType
    ? Fields & Stable<NoExtraProps<
      Partial<Entity<T>>,
      Fields
    >> | null
    : null,
): T extends EntityType ? Entity<T> | null : null {
  const fieldsArr = useMemo(
    () => (fields ? Object.entries(fields) : []),
    [fields],
  );
  if (!process.env.PRODUCTION && isDebug) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const allEntities = useAllEntities(type && fields ? type : null);
    if ([...allEntities.values()].filter(ent => {
      for (const pair of fieldsArr) {
        // @ts-ignore wontfix entity field
        if (ent[pair[0]] !== pair[1]) {
          return false;
        }
      }
      return true;
    }).length > 1) {
      throw new Error(`useEntityByUniqueFields(${type}): multiple matches`);
    }
  }

  const getEntitiesByUniqueFields = useGetEntitiesByUniqueFields(type);
  const [id, setId] = useMemoWithState(
    () => {
      if (!type || !fieldsArr.length) {
        return null;
      }
      const entitiesIndex = getEntitiesByUniqueFields(
        // @ts-ignore entity field
        fieldsArr.map(pair => pair[0]),
      );
      const key = fieldsArr.length === 1
        ? fieldsArr[0][1]
        : fieldsArr.map(pair => pair[1]).join(',');
      return entitiesIndex.get(key)?.id ?? null;
    },
    [type, fieldsArr],
  );

  const { addEntityListener } = useEntitiesStore();
  useEffect(() => {
    if (!type) {
      return NOOP;
    }

    const handleLoad = (ent: Entity) => {
      if (!fieldsArr.length) {
        return;
      }
      for (const pair of fieldsArr) {
        // @ts-ignore wontfix entity field
        if (ent[pair[0]] !== pair[1]) {
          return;
        }
      }

      setId(ent.id);
    };
    const unsubs = id
      ? [
        addEntityListener('delete', type, id, () => setId(null)),
      ]
      : [
        addEntityListener('load', type, handleLoad),
        addEntityListener('create', type, handleLoad),
      ];
    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [addEntityListener, fieldsArr, id, type, setId]);

  const entity = useEntity(type, id) as T extends EntityType ? Entity<T> | null : null;

  if (!process.env.PRODUCTION && isDebug) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCheckEntityExists(
      type,
      fields as Stable<ObjectOf<any>>,
      entity,
    );
  }

  return entity;
}
