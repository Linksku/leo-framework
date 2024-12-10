import safeParseJson from 'utils/safeParseJson';

function useJson<T>(
  json: string,
  validator: Stable<(val2: any) => boolean>,
  err: Stable<Error>,
): Stable<T>;

function useJson<T>(
  json: string,
  validator?: Stable<(val2: any) => boolean>,
  err?: Stable<Error>,
): Stable<T> | undefined;

function useJson<T>(
  json: string,
  validator?: Stable<(val2: any) => boolean>,
  err?: Stable<Error>,
): Stable<T> | undefined {
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
