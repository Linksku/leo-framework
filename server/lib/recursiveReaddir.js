const path = require('path');
const fs = require('fs').promises;

async function recursiveReaddirHelper(dir, allFiles = []) {
  const files = (await fs.readdir(dir)).map(f => path.join(dir, f));
  allFiles.push(...files);
  await Promise.all(files.map(async f => (
    (await fs.stat(f)).isDirectory() && recursiveReaddirHelper(f, allFiles)
  )));
  return allFiles;
}

module.exports = async function recursiveReaddir(dir) {
  const allFiles = await recursiveReaddirHelper(dir);
  return allFiles.map(file => file.replace(dir, ''));
};
