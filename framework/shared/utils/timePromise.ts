import chalk from 'chalk';

export default function timePromise<T extends Promise<any>>(
  name: string,
  promise: T,
): T {
  const startTime = performance.now();
  return promise.then(res => {
    // eslint-disable-next-line no-console
    console.log(chalk.cyan(`${name} took ${Math.round(performance.now() - startTime)}ms`));

    return res;
  }) as T;
}
