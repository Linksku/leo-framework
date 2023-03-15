import 'cypress';

import TestIds from '../../../app/shared/consts/testIds';

declare global {
  namespace Cypress {
    interface Chainable {
      getTestid(id: keyof typeof TestIds): Cypress.Chainable<JQuery>;

      register({
        email,
        password,
        name,
        birthday,
      }: {
        email: string,
        password: string,
        name: string,
        birthday: Date,
      }): Cypress.Chainable<void>;

      login(email: string, password: string): Cypress.Chainable<void>;

      auth(): Cypress.Chainable<void>;
    }
  }
}
