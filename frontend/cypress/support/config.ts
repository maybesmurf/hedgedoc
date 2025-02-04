/*
 * SPDX-FileCopyrightText: 2022 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { AuthProviderType } from '../../src/api/config/types'

declare namespace Cypress {
  interface Chainable {
    loadConfig(): Chainable<Window>
  }
}

export const branding = {
  name: 'DEMO Corp',
  logo: '/public/img/demo.png'
}

export const authProviders = [
  {
    type: AuthProviderType.FACEBOOK
  },
  {
    type: AuthProviderType.GITHUB
  },
  {
    type: AuthProviderType.TWITTER
  },
  {
    type: AuthProviderType.DROPBOX
  },
  {
    type: AuthProviderType.GOOGLE
  },
  {
    type: AuthProviderType.LOCAL
  },
  {
    type: AuthProviderType.LDAP,
    identifier: 'test-ldap',
    providerName: 'Test LDAP'
  },
  {
    type: AuthProviderType.OAUTH2,
    identifier: 'test-oauth2',
    providerName: 'Test OAuth2'
  },
  {
    type: AuthProviderType.SAML,
    identifier: 'test-saml',
    providerName: 'Test SAML'
  },
  {
    type: AuthProviderType.GITLAB,
    identifier: 'test-gitlab',
    providerName: 'Test GitLab'
  }
]

export const config = {
  allowAnonymous: true,
  allowRegister: true,
  authProviders: authProviders,
  branding: branding,
  useImageProxy: false,
  specialUrls: {
    privacy: 'https://example.com/privacy',
    termsOfUse: 'https://example.com/termsOfUse',
    imprint: 'https://example.com/imprint'
  },
  version: {
    major: 0,
    minor: 0,
    patch: 0,
    preRelease: '',
    commit: 'MOCK'
  },
  plantumlServer: 'http://mock-plantuml.local',
  maxDocumentLength: 200
}

Cypress.Commands.add('loadConfig', (additionalConfig?: Partial<typeof config>) => {
  return cy.intercept('/api/private/config', {
    statusCode: 200,
    body: {
      ...config,
      ...additionalConfig
    }
  })
})

beforeEach(() => {
  cy.loadConfig()

  cy.intercept('GET', '/public/motd.md', {
    body: '404 Not Found!',
    statusCode: 404
  })
  cy.intercept('HEAD', '/public/motd.md', {
    statusCode: 404
  })
})
