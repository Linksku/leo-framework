const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const mkdirp = require('mkdirp');
const childProcess = require('child_process');

const {
  APP_NAME,
  SITE_TITLE,
  BASE_PATH,
  ASSETS_URL,
  HOME_URL,
} = require('../shared/settings');

const template = fs.readFileSync(path.resolve('./web/templates/index.ejs'));
const renderTemplate = ejs.compile(`${template}`);

mkdirp(path.resolve(`./build/web/`))
  .then(() => {
    fs.writeFile(
      path.resolve('./build/web/index.html'),
      renderTemplate({
        name: APP_NAME,
        title: SITE_TITLE,
        basePath: BASE_PATH,
        assetsUrl: ASSETS_URL,
        homeUrl: HOME_URL,
        description: '',
        version: Number.parseInt(
          (childProcess.execSync('cd src; git rev-list --count master; cd ..').toString()).trim(),
          10,
        ),
        content: '<div id="react"></div>',
        path: '',
        id: 'main',
        isDynamic: true,
        production: process.env.NODE_ENV === 'production',
      }),
      err => {
        if (err) {
          console.log(err);
        }
      },
    );
  })
  .catch(err => {
    console.error('Failed to build index.html', err);
    throw err;
  });
