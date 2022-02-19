import path from 'path';
import fs from 'fs';

// Lazy version of Excel base 26
function intToChars(n) {
  let str = '';
  while (n > 26) {
    str += String.fromCodePoint((n % 26) + 97);
    n = Math.floor(n / 26);
  }
  str += String.fromCodePoint(n - 1 + 97);
  return [...str].reverse().join('');
}

let nextInt = 1;
let cssClasses;
try {
  cssClasses = fs.readFileSync(path.resolve('./build/cssClasses')).toJSON();
} catch {
  cssClasses = {};
}

process.on('exit', () => {
  fs.writeFileSync(path.resolve('./build/cssClasses'), JSON.stringify(cssClasses));
});

export default function shortenCssClass(loaderContext, localIdentName, localName) {
  const baseName = path.parse(loaderContext.resourcePath).name;
  let className = localIdentName.replace(/\[name]/gi, baseName);
  className = className.replace(/\[local]/gi, localName);
  if (!cssClasses[className]) {
    cssClasses[className] = intToChars(nextInt);
    nextInt++;
  }
  return cssClasses[className];
}
