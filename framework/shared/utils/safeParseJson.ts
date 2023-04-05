export default function safeParseJson<T>(
  str: string,
  validator?: (val: any) => boolean,
): T | undefined {
  try {
    const parsed = JSON.parse(str);
    if (!validator || validator(parsed)) {
      return parsed;
    }
  } catch {}
  return undefined;
}
