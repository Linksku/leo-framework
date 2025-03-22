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

export default function shortenCssClass(filePath) {
  return (loaderContext, localIdentName, localName) => {
    if (!cssClasses) {
      try {
        cssClasses = fs.readFileSync(path.resolve(filePath)).toJSON();
      } catch {
        cssClasses = Object.create(null);
      }

      process.on('exit', () => {
        fs.writeFileSync(path.resolve(filePath), JSON.stringify(cssClasses));
      });
    }

    const fileName = path.parse(loaderContext.resourcePath).name;
    const className = localIdentName
      .replaceAll(/\[name]/gi, fileName)
      .replaceAll(/\[local]/gi, localName);
    if (!cssClasses[className]) {
      cssClasses[className] = intToChars(nextInt);
      nextInt++;
    }
    return cssClasses[className];
  };
}
