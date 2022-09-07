import type { ExecOptions } from 'child_process';
import childProcess from 'child_process';
import { promisify } from 'util';

export default function exec(
  cmd: string,
  opts?: {
    encoding?: BufferEncoding;
  } & ExecOptions,
) {
  return promisify(childProcess.exec)(cmd, opts) as Promise<{ stdout: string, stderr: string }>;
}
