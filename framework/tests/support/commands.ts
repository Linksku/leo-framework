import dayjs from 'dayjs';

import { HOME_URL } from 'settings';
import TestIds from '../../../app/shared/consts/testIds';

Cypress.Commands.addAll({
  getTestid(id: keyof typeof TestIds) {
    return cy.get(`[data-testid=${TestIds[id]}]`);
  },

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
  }) {
    cy.visit('/register');

    cy.getTestid('registerForm').within(() => {
      cy.get('input[name=email]').type(email);
      cy.get('input[name=password]').type(password);
      cy.get('input[name=name]').type(name);
      cy.get('input[name=birthday]').type(dayjs(birthday).format('YYYY-MM-DD'));
      cy.get('input[type=submit]').click();
    });

    cy.url({ timeout: 10_000 }).should('eq', `${HOME_URL}/onboard?registered`);
    cy.getAllLocalStorage().then(localStorage => {
      expect(localStorage[HOME_URL]).to.have.property('authToken');
    });
  },

  login(email: string, password: string) {
    cy.visit('/login');

    cy.getTestid('loginForm').within(() => {
      cy.get('input[name=email]').type(email);
      cy.get('input[name=password]').type(password);
      cy.get('input[type=submit]').click();
    });

    cy.url().should('eq', `${HOME_URL}/`);
    cy.getAllLocalStorage().then(localStorage => {
      expect(localStorage[HOME_URL]).to.have.property('authToken');
    });
  },

  auth() {
    cy.fixture('auth').then(authFixture => {
      cy.session(authFixture.email, () => {
        cy.login(authFixture.email, authFixture.password);
      });
    });
  },
});
