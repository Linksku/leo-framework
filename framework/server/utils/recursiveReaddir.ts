import path from 'path';
import { promises as fs } from 'fs';

async function recursiveReaddirHelper(dir: string, allFiles: string[] = []) {
  const fileNames = await fs.readdir(dir);
  const filePaths = fileNames.map(f => path.join(dir, f));
  allFiles.push(...filePaths);
  await Promise.all(filePaths.map(async f => {
    const stat = await fs.stat(f);
    return stat.isDirectory() && recursiveReaddirHelper(f, allFiles);
  }));
  return allFiles;
}

export default async function recursiveReaddir(dir: string) {
  const allFiles = await recursiveReaddirHelper(dir);
  return allFiles.map(file => file.replace(dir, ''));
}
