import Manager from './services/manager';
import { resolve } from 'path';
const { TimelineService } = require('wdio-timeline-reporter/timeline-service');

const capabilities = [
  {
    browserName: 'chrome',
    browserVersion: 'stable',
    acceptInsecureCerts: true,
    unhandledPromptBehavior: 'accept and notify',
    'goog:chromeOptions': {
      args: ['--remote-debugging-port=9222'],
      prefs: {
        directory_upgrade: true,
        prompt_for_download: false,
      },
    },
    'wdio:devtoolsOptions': { headless: false },
  },
];

const mode = process.env.MODE ?? 'dev';
const result = resolve(__dirname, './result');

export const config: WebdriverIO.Config = {
  runner: 'local',
  strictSSL: false,
  capabilities: capabilities,
  maxInstances: 1,
  logLevel: 'warn',
  waitforTimeout: 5000,
  suites: {
    regression: ['./specs/features/*.spec.ts'],
  },
  services: [
    [Manager, { mode }],
    ['shared-store', {}],
    ['intercept', {}],
    [TimelineService, {}],
  ],
  reporters: [
    ['spec', {}],
    ['timeline', { outputDir: result, embedImages: true, screenshotStrategy: 'on:error' }],
  ],
  framework: 'jasmine',
  jasmineOpts: {
    stopSpecOnExpectationFailure: true,
    defaultTimeoutInterval: 120000,
  },
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: { transpileOnly: true, files: true, project: 'tsconfig.json' },
  },
};
