import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import mkdirp from 'mkdirp';
import childProcess from 'child_process';

import {
  APP_NAME,
  SITE_TITLE,
  BASE_PATH,
  HOME_URL,
  ASSETS_URL,
} from 'settings';
import recursiveReaddir from 'utils/recursiveReaddir';
import { SPACES_HOST } from 'consts/infra';

export default async function buildTemplates() {
  const files = await recursiveReaddir(path.resolve('./framework/web/templates'));

  await Promise.all(files
    .filter(file => file.endsWith('.ejs') && !file.startsWith('/partials/'))
    .map(async file => {
      const resolvedInPath = path.resolve(`./framework/web/templates/${file}`);
      const resolvedOutPath = path.resolve(`./build/${process.env.NODE_ENV}/web/${file.replace(/\.ejs$/, '.html')}`);

      const template = await fs.promises.readFile(resolvedInPath);

      await mkdirp(path.dirname(resolvedOutPath));
      await fs.promises.writeFile(
        resolvedOutPath,
        ejs.render(
          template.toString(),
          {
            name: APP_NAME,
            title: SITE_TITLE,
            basePath: BASE_PATH,
            assetsUrl: ASSETS_URL,
            homeUrl: HOME_URL,
            description: process.env.DESCRIPTION,
            production: process.env.PRODUCTION,
            fileVersion: process.env.NODE_ENV === 'production'
              ? `.${childProcess.execSync('git rev-list --count master').toString().trim()}`
              : '',
            spacesHost: SPACES_HOST,
          },
          {
            filename: resolvedInPath,
          },
        ),
      );
    }),
  );
}
