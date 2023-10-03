type _EntryType<T extends ObjectOf<any>> = {
  [K in keyof T & string]: [K, T[K]];
}[keyof T & string];

function objEntries<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: false,
): _EntryType<OmitOptional<Obj>>[];

function objEntries<
  Obj extends ObjectOf<any>,
>(
  obj: Obj,
  keepUndefined: true,
): Exclude<_EntryType<Obj>, undefined>[];

function objEntries<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: boolean,
) {
  if (keepUndefined) {
    return Object.entries(obj);
  }
  return Object.entries(obj).filter(
    arr => arr[1] !== undefined,
  );
}

export default objEntries;
