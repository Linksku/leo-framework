const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const mkdirp = require('mkdirp');

const {
  APP_NAME,
  SITE_TITLE,
  DOMAIN_NAME,
  BASE_PATH,
  HOME_URL,
} = require('../shared/settings');
const recursiveReaddir = require('../server/lib/recursiveReaddir');

(async () => {
  const files = await recursiveReaddir(path.resolve('./web/templates'));

  await Promise.all(files.filter(file => file.endsWith('.ejs')).map(async file => {
    const resolvedInPath = path.resolve(`./web/templates/${file}`);
    const resolvedOutPath = path.resolve(`./build/web/${file.replace(/\.ejs$/, '.html')}`);

    const template = await fs.promises.readFile(resolvedInPath);

    await mkdirp(path.dirname(resolvedOutPath));
    // todo: mid/share add og tags, maybe change this to server script
    await fs.promises.writeFile(
      resolvedOutPath,
      ejs.render(template.toString(), {
        name: APP_NAME,
        title: SITE_TITLE,
        basePath: BASE_PATH,
        assetsUrl: process.env.SERVER === 'production'
          ? `https://assets.${DOMAIN_NAME}`
          : HOME_URL,
        homeUrl: HOME_URL,
        description: process.env.DESCRIPTION,
        content: '<div id="react"></div>',
        id: 'main',
        production: process.env.NODE_ENV === 'production',
      }),
      err => {
        if (err) {
          console.log(err);
        }
      },
    );
  }));
})()
  .catch(err => {
    console.error('Failed to build template', err);
    throw err;
  });
