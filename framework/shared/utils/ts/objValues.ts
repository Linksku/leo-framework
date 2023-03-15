type _EntryType<T extends ObjectOf<any>> = {
  [K in keyof T & string]: T[K];
}[keyof T & string];

function objValues<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: false,
): _EntryType<{
  [K in keyof Obj]-?: Exclude<Obj[K], undefined>;
}>[];

function objValues<
  Obj extends ObjectOf<any>,
>(
  obj: Obj,
  keepUndefined: true,
): Exclude<_EntryType<Obj>, undefined>[];

function objValues<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: boolean,
) {
  if (keepUndefined) {
    return Object.values(obj);
  }
  return Object.values(obj).filter(
    val => val !== undefined,
  );
}

export default objValues;
