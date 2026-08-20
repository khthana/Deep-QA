'use strict';

const { defineConfig, devices } = require('@playwright/test');
const { E2E_SCHEMA, BACKEND_PORT, FRONTEND_PORT, BACKEND_URL, FRONTEND_URL } = require('./support/env');

/**
 * The browser seam - #65.
 *
 * The backend suite exercises the HTTP surface in process. This one exercises
 * what only a browser can reach: that a screen typed into the address bar is
 * refused by the server rather than merely missing from a menu, and that a
 * template downloaded from a button and posted back is applied or rejected as
 * a whole. Both servers are real, the database is real, and nothing about the
 * session is stubbed - the driver signs in through the sign-in screen with a
 * seeded account, for the reason docs/06 gives for the backend suite.
 *
 * Three settings here are load-bearing rather than taste:
 *
 * `reuseExistingServer: false`. The default is `!process.env.CI`, and with it
 * a run on a developer's machine would silently attach to whatever `npm start`
 * is already listening - which is pointed at the development schema. The import
 * tests write students. Dedicated ports and an explicit `false` are what keep
 * this suite out of the data someone is working in.
 *
 * `FRONTEND_URL` on the backend has to match the frontend's origin exactly.
 * app.js allows one origin with credentials enabled, so a mismatch does not
 * fail loudly: every request simply arrives without its cookie, and the whole
 * suite fails as though nothing were authorised.
 *
 * `workers: 1`. Every spec shares one schema, and rows that assert a total
 * count are only meaningful if nothing else is inserting while they run.
 */
module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  globalSetup: require.resolve('./support/global-setup'),
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        PORT: String(BACKEND_PORT),
        DB_SCHEMA: E2E_SCHEMA,
        FRONTEND_URL,
      },
    },
    {
      // CRA's dev server rather than a build: the frontend has no static
      // server of its own, and adding one to serve a build would be a
      // dependency this seam does not need.
      command: 'npx --no-install react-scripts start',
      cwd: '../frontend',
      url: FRONTEND_URL,
      reuseExistingServer: false,
      // A cold CRA start on Windows is well past the 60s default.
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(FRONTEND_PORT),
        BROWSER: 'none',
        REACT_APP_API_URL: BACKEND_URL,
      },
    },
  ],
});
