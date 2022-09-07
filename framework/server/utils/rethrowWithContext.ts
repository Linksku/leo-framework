export default function rethrowWithContext(_err: unknown, context: string) {
  const err = _err instanceof Error
    ? _err
    : new Error(`rethrowWithContext: non-error was thrown: ${`${_err}`.slice(0, 100)}`);
  const newError = new ErrorWithCtx(err.message, context);

  const { stack } = err;
  if (stack) {
    const stackLines = stack.split('\n');
    const curStack = (new Error('rethrowWithContext')).stack ?? '';
    const curStackDepth = (curStack.match(/\n/g) || []).length;
    if (stackLines.length <= curStackDepth) {
      throw err;
    }

    const curStackIdx = stackLines.length - curStackDepth + 1;
    stackLines[curStackIdx] = stackLines[curStackIdx].replace(/^ +at ([^(]+) \(/, `  at $1(${context}) (`);

    newError.stack = stackLines.join('\n');
  }

  throw newError;
}
