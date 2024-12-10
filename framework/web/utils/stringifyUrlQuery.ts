import removeUndefinedValues from 'utils/removeUndefinedValues';

export default function stringifyUrlQuery(params: ObjectOf<string | number>): string {
  const qs = new URLSearchParams(
    // @ts-expect-error URLSearchParams can accept numbers
    removeUndefinedValues(params),
  );
  return qs.toString();
}
