import type { SpawnOptions } from 'child_process';
import childProcess from 'child_process';

export default function spawn(
  cmd: string,
  args: ReadonlyArray<string>,
  _opts?: {
    stream?: boolean,
  } & SpawnOptions,
): Promise<number | null> {
  const { stream, ...opts } = _opts ?? {};
  return new Promise((succ, fail) => {
    const child = childProcess.spawn(cmd, args, opts);

    child.on('error', err => {
      fail(getErr(err, { cmd, args }));
      child.kill();
    });

    if (stream) {
      child.stdout?.on('data', data => {
        process.stdout.write(data.toString());
      });

      child.stderr?.on('data', data => {
        process.stdout.write(data.toString());
      });
    }

    child.on('close', code => {
      succ(code);
    });
  });
}
