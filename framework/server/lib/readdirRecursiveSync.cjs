const fs = require('fs');

module.exports = function readdirRecursiveSync(dir) {
  if (dir[dir.length - 1] === '/') {
    dir = dir.slice(0, -1);
  }

  const files = fs.readdirSync(dir);
  const ret = [];

  for (const file of files) {
    const filePath = `${dir}/${file}`;
    if (fs.statSync(filePath).isDirectory()) {
      ret.push(...readdirRecursiveSync(filePath).map(p => `${file}/${p}`));
    } else {
      ret.push(file);
    }
  }

  return ret;
};
