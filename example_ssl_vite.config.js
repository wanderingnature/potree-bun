import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'



// https://vite.dev/config/
export default defineConfig({
  plugins:
      [vue()],
  server: {
    https: {
      key: fs.readFileSync('/media/nicholas/PROJECTS/ssl/ubuntu-dev.key'),
      cert: fs.readFileSync('/media/nicholas/PROJECTS/ssl/ubuntu-dev.crt'),
    },
    host: '0.0.0.0', // Allow access from other devices
    port: 5443, // You can change the port if needed
    strictPort: true, // Ensures the specified port is used
    allowedHosts: ['ubuntu-dev', 'localhost', '192.168.x.x'], // Add your hostname and IP
  },
  test: {
    // Global test timeout (20 seconds - longer timeout for real backend API tests)
    testTimeout: 20000,

    // Environment setup
    environment: 'node',

    // Retry failed tests once
    retry: 1,

    // More descriptive test output
    reporters: ['verbose'],

    // Global setup for all tests
    globalSetup: [],

    // Configure console output during tests
    logHeapUsage: true,

    // Fail tests fast when errors are detected
    bail: false,

    // Maximum number of workers
    maxThreads: 1, // Single thread for more stable API testing
    minThreads: 1,

    // Test failure output behavior
    outputTruncateLength: 8000, // Show more context in errors
    outputDiffLines: 30, // Show more lines in diffs
  },
})
