import { promises as fs } from 'fs';

export default async function readdirRecursive(dir: string) {
  if (dir.at(-1) === '/') {
    dir = dir.slice(0, -1);
  }

  const files = await fs.readdir(dir);
  const ret: string[] = [];

  for (const file of files) {
    const filePath = `${dir}/${file}`;
    // eslint-disable-next-line no-await-in-loop
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      const childFiles = await readdirRecursive(filePath);
      ret.push(...childFiles.map(p => `${file}/${p}`));
    } else {
      ret.push(file);
    }
  }

  return ret;
}
