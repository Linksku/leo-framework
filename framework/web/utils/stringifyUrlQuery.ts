import removeUndefinedValues from 'utils/removeUndefinedValues';

export default function stringifyUrlQuery(params: ObjectOf<string | number>): string {
  const qs = new URLSearchParams(removeUndefinedValues(params));
  return qs.toString();
}
