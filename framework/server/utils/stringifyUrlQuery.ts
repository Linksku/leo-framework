import { URLSearchParams } from 'url';
import removeUndefinedValues from 'utils/removeUndefinedValues';

export default function stringifyUrlQuery(params: ObjectOf<string | number>): string {
  params = removeUndefinedValues(params);
  const qs = new URLSearchParams(
    // @ts-expect-error URLSearchParams can accept numbers
    params,
  );
  return qs.toString();
}
