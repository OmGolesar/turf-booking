/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  // Container boot + migrate + seed can take 30–60s on a cold pull.
  testTimeout: 180_000,
  // Force sequential execution: each spec file starts its own container, and
  // running them in parallel would OOM most laptops and rate-limit CI.
  maxWorkers: 1,
};
