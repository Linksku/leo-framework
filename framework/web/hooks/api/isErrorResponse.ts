export default function isErrorResponse(
  res: any,
): res is Nullish<Readonly<StableDeep<ApiErrorResponse>>> {
  return !res || res.error || !TS.hasProp(res, 'data');
}
