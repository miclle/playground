import type { Options } from '@wdio/types'
import path from 'path'

export const config: Options.Testrunner = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      files: true
    }
  },

  //
  // ==================
  // Specify Test Files
  // ==================
  specs: ['./e2e/**/*.spec.ts'],
  exclude: [],

  //
  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  capabilities: [{
    browserName: '',
    'wdio:electronServiceOptions': {
      appBinaryPath: path.join(
        process.cwd(),
        // Adjust path based on your build output
        'out',
        'main',
        'index.js'
      ),
      appArgs: ['--no-sandbox']
    }
  }],

  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  baseUrl: '',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['electron'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  //
  // =====
  // Hooks
  // =====
  before: function () {
    // Add custom commands or setup here
  },

  after: function () {
    // Cleanup here
  }
}
