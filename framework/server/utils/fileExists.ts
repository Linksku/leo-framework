import { promises as fs } from 'fs';

export default async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {}
  return false;
}
