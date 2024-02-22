type Cb = (...args: any[]) => void;

export default class EventEmitter {
  _callbacks = new Map<string, Cb[]>();

  on(eventName: string, cb: Cb) {
    const callbacks = TS.mapValOrSetDefault(
      this._callbacks,
      eventName,
      [],
    );
    if (!process.env.PRODUCTION && callbacks.includes(cb)) {
      throw new Error(`EventEmitter.on(${eventName}): cb already added`);
    }

    callbacks.push(cb);
  }

  off(eventName: string, cb: Cb) {
    const callbacks = this._callbacks.get(eventName);
    if (callbacks) {
      const idx = callbacks.indexOf(cb);
      if (idx >= 0) {
        callbacks.splice(idx, 1);
      } else if (!process.env.PRODUCTION) {
        // eslint-disable-next-line no-console
        console.log(`EventEmitter.off(${eventName}): cb doesn't exist`);
      }
    }
  }

  emit(eventName: string, ...args: any[]): void;

  emit(eventName: string) {
    const callbacks = this._callbacks.get(eventName);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(...Array.prototype.slice.call(
          // eslint-disable-next-line prefer-rest-params
          arguments,
          1,
        ));
      }
    }
  }
}
