export default function isErrorResponse(res: any): res is Nullish<MemoDeep<ApiErrorResponse>> {
  return !res || res.error || !hasOwnProperty(res, 'data') || res.status !== 200;
}
