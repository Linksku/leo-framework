export default function safeGet(obj: any, path: (string | number)[]): unknown {
  return path.reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return acc[key];
    }
    return null;
  }, obj);
}
