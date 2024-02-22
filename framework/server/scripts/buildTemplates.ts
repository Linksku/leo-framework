import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import childProcess from 'child_process';

import { APP_NAME } from 'config';
import {
  BASE_PATH,
  HOME_URL,
  ASSETS_URL,
  API_URL,
} from 'consts/server';
import { DO_SPACES_HOST } from 'config/serverConfig';
import readdirRecursive from 'utils/readdirRecursive';

export default async function buildTemplates() {
  const files = await readdirRecursive(path.resolve('./framework/web/templates'));

  await Promise.all(files
    .filter(file => file.endsWith('.ejs') && !file.startsWith('/partials/'))
    .map(async file => {
      const resolvedInPath = path.resolve(`./framework/web/templates/${file}`);
      const resolvedOutPath = path.resolve(
        `./build/${process.env.NODE_ENV}/web/${file.replace(/\.ejs$/, '.html')}`,
      );

      const template = await fs.promises.readFile(resolvedInPath);

      await mkdirp(path.dirname(resolvedOutPath));
      await fs.promises.writeFile(
        resolvedOutPath,
        ejs.render(
          template.toString(),
          {
            appName: APP_NAME,
            title: APP_NAME,
            basePath: BASE_PATH,
            assetsUrl: ASSETS_URL,
            apiUrl: API_URL,
            homeUrl: HOME_URL,
            production: process.env.PRODUCTION,
            fileVersion: process.env.NODE_ENV === 'production'
              ? `.${childProcess.execSync('git rev-list --count master').toString().trim()}`
              : '',
            spacesHost: DO_SPACES_HOST,
          },
          {
            filename: resolvedInPath,
          },
        ),
      );
    }),
  );
}
