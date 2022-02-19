type _EntryType<T extends ObjectOf<any>> = {
  [K in keyof T]: [K, T[K]];
}[keyof T];

function objEntries<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: false,
): _EntryType<{
  [K in keyof Obj]-?: Exclude<Obj[K], undefined>;
}>[];

function objEntries<
  Obj extends ObjectOf<any>
>(
  obj: Obj,
  keepUndefined: true,
): Exclude<_EntryType<{
  [K in keyof Obj]: Obj[K];
}>, undefined>[];

function objEntries<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: boolean,
) {
  if (keepUndefined) {
    return Object.entries(obj);
  }
  return Object.entries(obj).filter(
    arr => typeof arr[1] !== 'undefined',
  );
}

export default objEntries;
