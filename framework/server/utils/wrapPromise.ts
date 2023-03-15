export default function wrapPromise<T extends Promise<any>>(
  promise: T,
  severity: 'warn' | 'error' | 'fatal',
  ctx?: string,
): void {
  promise
    .catch(err => ErrorLogger[severity](err, { ctx }))
    .catch(err => {
      // eslint-disable-next-line no-console
      console.log(err);
      if (severity === 'fatal') {
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
      }
    });
}
