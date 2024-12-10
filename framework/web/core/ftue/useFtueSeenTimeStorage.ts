import { useLocalStorage, nonNegIntValidator } from 'utils/useStorage';
import useEntityByUniqueFields from 'stores/entities/useEntityByUniqueFields';

export default function useFtueSeenTimeStorage(type: string) {
  const currentUserId = useCurrentUserId();
  const seenTimeEnt = useEntityByUniqueFields(
    'ftueSeenTime',
    useMemo(
      () => (currentUserId
        ? { userId: currentUserId, ftueType: type }
        : null),
      [currentUserId, type],
    ),
    { skipCheckEntityExists: true },
  );

  const [val, setVal] = useLocalStorage<number>(
    `ftueSeenTime:${type}`,
    0,
    nonNegIntValidator,
  );

  const seenTime = Math.max(seenTimeEnt?.time.getTime() ?? 0, val);
  useEffect(() => {
    if (seenTime) {
      setVal(seenTime);
    }
  }, [seenTime, setVal]);

  return TS.tuple(seenTime, setVal);
}
