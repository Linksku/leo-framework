import resolvedPromise from 'utils/resolvedPromise';

export default window.queueMicrotask
  ?? function queueMicrotask(cb: () => void) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    resolvedPromise.then(cb);
  };
