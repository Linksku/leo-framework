function useJson<T>(
  json: string,
  validator: Memoed<(val2: any) => boolean>,
  err: Memoed<Error>,
): Memoed<T>;

function useJson<T>(
  json: string,
  validator?: Memoed<(val2: any) => boolean>,
  err?: Memoed<Error>,
): Memoed<T> | null;

function useJson<T>(
  json: string,
  validator?: Memoed<(val2: any) => boolean>,
  err?: Memoed<Error>,
): Memoed<T> | null {
  return useMemo(() => {
    let val: unknown;
    try {
      val = JSON.parse(json);
    } catch {
      if (err) {
        throw err;
      }
      return null;
    }

    if (validator && !validator(val)) {
      if (err) {
        throw err;
      }
      return null;
    }
    return val as T;
  }, [json, validator, err]);
}

export default useJson;
