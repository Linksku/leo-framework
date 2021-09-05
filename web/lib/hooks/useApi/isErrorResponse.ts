export default function isErrorResponse(res: any): res is Nullish<MemoDeep<ApiErrorResponse>> {
  return !res || res.error || !TS.hasProperty(res, 'data');
}
