export const debugLogAtom = atom<{ time: Date, msg: string }[]>([]);

export default function useDebugLog() {
  const [debugLog, setDebugLog] = useAtom(debugLogAtom);
  return TS.tuple(
    debugLog,
    useCallback((msg: string) => {
      setDebugLog(s => [...s, { time: new Date(), msg }]);
    }, [setDebugLog]),
  );
}
