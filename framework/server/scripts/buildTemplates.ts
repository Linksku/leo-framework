import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import mkdirp from 'mkdirp';
import childProcess from 'child_process';

import {
  APP_NAME,
  SITE_TITLE,
  DOMAIN_NAME,
  BASE_PATH,
  HOME_URL,
} from 'settings';
import recursiveReaddir from 'utils/recursiveReaddir';

export default async function buildTemplates() {
  const files = await recursiveReaddir(path.resolve('./framework/web/templates'));

  await Promise.all(files.filter(file => file.endsWith('.ejs')).map(async file => {
    const resolvedInPath = path.resolve(`./framework/web/templates/${file}`);
    const resolvedOutPath = path.resolve(`./build/${process.env.NODE_ENV}/web/${file.replace(/\.ejs$/, '.html')}`);

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
          : '',
        homeUrl: HOME_URL,
        description: process.env.DESCRIPTION,
        content: '<div id="react"></div>',
        id: 'main',
        production: process.env.PRODUCTION,
        fileVersion: process.env.SERVER === 'production'
          ? `.${childProcess.execSync('git rev-list --count master').toString().trim()}`
          : '',
      }),
    );
  }));
}
