/* eslint-disable no-extend-native */

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value(this: any[], index: number) {
      index = index >= 0 ? index : this.length + index;

      if (index < 0 || index >= this.length) {
        return undefined;
      }

      return this[index];
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
