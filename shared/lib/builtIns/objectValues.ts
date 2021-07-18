type _EntryType<T extends ObjectOf<any>> = {
  [K in keyof T]: T[K];
}[keyof T];

function objectValues<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: false,
): _EntryType<{
  [K in keyof Obj]-?: Exclude<Obj[K], undefined>;
}>[];

function objectValues<
  Obj extends ObjectOf<any>
>(
  obj: Obj,
  keepUndefined: true,
): Exclude<_EntryType<{
  [K in keyof Obj]: Obj[K];
}>, undefined>[];

function objectValues<Obj extends ObjectOf<any>>(
  obj: Obj,
  keepUndefined?: boolean,
) {
  if (keepUndefined) {
    return Object.values(obj);
  }
  return Object.values(obj).filter(
    val => typeof val !== 'undefined',
  );
}

export default objectValues;
