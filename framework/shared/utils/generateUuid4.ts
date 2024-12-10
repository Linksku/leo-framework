// From https://github.com/ionic-team/capacitor-plugins/blob/main/device/src/web.ts
export default function generateUuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    c => {
      // eslint-disable-next-line no-bitwise, unicorn/prefer-math-trunc
      const r = (Math.random() * 16) | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}
