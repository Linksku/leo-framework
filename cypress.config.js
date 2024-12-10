import { promises as fs } from 'fs';
import path from 'path';
import { defineConfig } from 'cypress';
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import Chance from 'chance';

import webpackConfig from './webpack.common.js';
import { HOME_URL } from './framework/shared/consts/server.js';

const chance = new Chance();

export default defineConfig({
  e2e: {
    baseUrl: HOME_URL,
    specPattern: [
      'framework/tests/e2e/**/*.cy.ts',
      'app/tests/e2e/runFirst/**/*.cy.ts',
      'app/tests/e2e/**/*.cy.ts',
      'app/tests/e2e/runLast/**/*.cy.ts',
    ],
    supportFile: 'framework/tests/support/e2e.ts',
    setupNodeEvents(on) {
      // todo: low/hard add test db, seeding, etc
      on('before:run', async () => {
        const email = `cypress+${chance.hash({ length: 10 })}@example.com`;

        // eslint-disable-next-line no-console
        console.log(`Using test user: ${email}`);
        await fs.writeFile(
          path.resolve('./framework/tests/fixtures/auth.json'),
          JSON.stringify({
            email,
            password: chance.hash({ length: 16 }),
          }, null, 2),
        );
      });

      on(
        'file:preprocessor',
        webpackPreprocessor({
          webpackOptions: webpackConfig,
        }),
      );

      on('task', {
        log(message) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });
    },
    experimentalMemoryManagement: true,
  },
  fixturesFolder: 'framework/tests/fixtures',
  screenshotsFolder: 'app/tests/screenshots',
  videosFolder: 'app/tests/videos',
  downloadsFolder: 'app/tests/downloads',
});
