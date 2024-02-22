import type { ExecOptions } from 'child_process';
import childProcess from 'child_process';

import stringify from 'utils/stringify';

export default function exec(
  cmd: string,
  _opts?: {
    encoding?: BufferEncoding,
    stream?: boolean,
  } & ExecOptions,
): Promise<{ stdout: string, stderr: string }> {
  const { stream, ...opts } = _opts ?? {};
  return new Promise((succ, fail) => {
    const child = childProcess.exec(cmd, opts, (err, stdout, stderr) => {
      if (err) {
        fail(err);
      } else {
        succ({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      }
    });

    if (stream) {
      child.stdout?.on('data', data => {
        process.stdout.write(
          data instanceof Buffer ? data.toString() : stringify(data),
        );
      });

      child.stderr?.on('data', data => {
        process.stdout.write(
          data instanceof Buffer ? data.toString() : stringify(data),
        );
      });
    }
  });
}
