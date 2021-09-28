import path from 'path';
import { promises as fs } from 'fs';

async function recursiveReaddirHelper(dir: string, allFiles: string[] = []) {
  const files = (await fs.readdir(dir)).map(f => path.join(dir, f));
  allFiles.push(...files);
  await Promise.all(files.map(async f => (
    (await fs.stat(f)).isDirectory() && recursiveReaddirHelper(f, allFiles)
  )));
  return allFiles;
}

export default async function recursiveReaddir(dir: string) {
  const allFiles = await recursiveReaddirHelper(dir);
  return allFiles.map(file => file.replace(dir, ''));
}
