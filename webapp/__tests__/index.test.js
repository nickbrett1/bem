import { createServer } from 'miragejs';
import { Toucan } from 'toucan-js';
import * as Sentry from '@sentry/browser';
import index from '../worker/src/index';

const sentryTestkit = require('sentry-testkit');

const { testkit, sentryTransport } = sentryTestkit();

jest.genMockFromModule('toucan-js');
jest.mock('toucan-js');
Toucan.mockImplementation(() => Sentry);

const DEFAULT_ENV = {
  SENTRY_ENVIRONMENT: 'development',
  GOOGLE_CLIENT_SECRET: 123,
  GOOGLE_CLIENT_ID: 123,
  KV: { get: () => 'allowed', put: () => {}, delete: () => {} },
};

const DUMMY_DSN = 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Worker routing', () => {
  beforeAll(() => {
    Sentry.init({
      dsn: DUMMY_DSN,
      transport: sentryTransport,
    });
  });

  let server;
  beforeEach(() => {
    testkit.reset();
    server = createServer({
      routes() {
        this.get('https://bemstudios.uk', () => ({}));
        this.get('https://bemstudios.uk/home', (x) => x);
        this.post('https://oauth2.googleapis.com/token', () => ({ json: '' }));
        this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
          verified_email: true,
        }));
        this.post('https://oauth2.googleapis.com/revoke');
      },
    });

    global.Response.redirect = jest.fn(() => ({ body: '' }));
  });
  afterEach(() => {
    server.shutdown();
  });

  it('redirects to preview if not logged in', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/home'),
      DEFAULT_ENV,
      {}
    );
    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('auth allows access if in KV', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      DEFAULT_ENV,
      {}
    );
    expect(response.headers.get('Location')).toEqual(
      'http://localhost:8787/home'
    );
  });

  it('auth denies access if not in KV', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/auth?code=123'),
      { ...DEFAULT_ENV, KV: { get: () => 'not allowed', put: () => {} } },
      {}
    );
    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('allows access if logged in', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/home', {
        headers: { cookie: 'auth=123' },
      }),
      { ...DEFAULT_ENV, KV: { get: (x) => (x === 123 ? x : 'allowed') } },
      {}
    );

    expect(response.url).toEqual('https://bemstudios.uk/home');
  });

  it('logs out', async () => {
    const response = await index.fetch(
      new Request('https://bemstudios.uk/logout', {
        headers: { cookie: 'auth=123' },
      }),
      {
        ...DEFAULT_ENV,
        KV: { get: (x) => (x === 123 ? x : 'allowed'), delete: () => {} },
      },
      { waitUntil: (x) => x }
    );

    expect(response.headers.get('Set-Cookie')).toEqual('auth=deleted; secure;');
    expect(response.headers.get('Location')).toEqual('http://localhost:8787');
  });

  it('redirect to preview on no auth cookie', async () => {
    await index.fetch(
      new Request('https://bemstudios.uk/home', {
        headers: { cookie: 'fake' },
      }),
      DEFAULT_ENV,
      {}
    );

    expect(global.Response.redirect).toBeCalledWith(
      'http://localhost:8787/preview',
      307
    );
  });

  it('reports to sentry if invalid env for auth', async () => {
    await expect(
      index.fetch(
        new Request('https://bemstudios.uk/auth?code=123'),
        {
          ...DEFAULT_ENV,
          GOOGLE_CLIENT_SECRET: undefined,
        },
        {}
      )
    ).rejects.toThrow(Error);

    expect(testkit.reports()).toHaveLength(1);
  });

  it('redirect to preview on no access token', async () => {});
});
