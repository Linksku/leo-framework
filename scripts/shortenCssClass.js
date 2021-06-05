const path = require('path');
const fs = require('fs');

// Lazy version of Excel base 26
function intToChars(n) {
  let str = '';
  while (n >= 26) {
    str += String.fromCharCode((n % 26) + 97);
    n /= 26;
  }
  str += String.fromCharCode(n - 1 + 97);
  return str.split('').reverse().join('');
}

let nextInt = 1;
let cssClasses;
try {
  cssClasses = JSON.parse(fs.readFileSync(path.resolve('./build/cssClasses')));
} catch {
  cssClasses = {};
}

process.on('exit', () => {
  fs.writeFileSync(path.resolve('./build/cssClasses'), JSON.stringify(cssClasses));
});

module.exports = function shortenCssClass(loaderContext, localIdentName, localName) {
  const baseName = path.parse(loaderContext.resourcePath).name;
  let className = localIdentName.replace(/\[name]/gi, baseName);
  className = className.replace(/\[local]/gi, localName);
  if (!cssClasses[className]) {
    cssClasses[className] = intToChars(nextInt);
    nextInt++;
  }
  return cssClasses[className];
};
