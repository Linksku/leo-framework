import { requestIdleCallback, cancelIdleCallback } from 'utils/requestIdleCallback';

let queue = [] as (() => void)[];

let ric: number | null = null;

const historyStateQueue = {
  isEmpty() {
    return queue.length === 0;
  },

  push(cb: () => void) {
    queue.push(cb);

    if (ric == null) {
      ric = requestIdleCallback(() => {
        for (const cb2 of queue) {
          cb2();
        }
        queue = [];
        ric = null;
      }, { timeout: 500 });
    }
  },

  flush() {
    if (ric != null) {
      cancelIdleCallback(ric);
      ric = null;
    }

    for (const cb of queue) {
      cb();
    }
    queue = [];
  },

  back() {
    // Probably can't cancel queued pushStates because if history.forward gets called,
    // history.state will be wrong
    historyStateQueue.flush();
    window.history.back();
  },

  forward() {
    historyStateQueue.flush();
    window.history.forward();
  },
};

export default historyStateQueue;
