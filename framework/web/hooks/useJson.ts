import safeParseJson from 'utils/safeParseJson';

function useJson<T>(
  json: string,
  validator: Memoed<(val2: any) => boolean>,
  err: Memoed<Error>,
): Memoed<T>;

function useJson<T>(
  json: string,
  validator?: Memoed<(val2: any) => boolean>,
  err?: Memoed<Error>,
): Memoed<T> | undefined;

function useJson<T>(
  json: string,
  validator?: Memoed<(val2: any) => boolean>,
  err?: Memoed<Error>,
): Memoed<T> | undefined {
  return useMemo(() => {
    const val = safeParseJson<T>(
      json,
      validator,
    );
    if (val === undefined && err) {
      throw err;
    }
    return val;
  }, [json, validator, err]);
}

export default useJson;
