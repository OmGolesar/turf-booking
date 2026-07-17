/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Unit specs live next to source; integration/e2e specs live under test/ and are
  // opted into by name so `npm run test:unit` doesn't try to boot Postgres.
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts', '!src/worker.main.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  // ponytail: coverage thresholds intentionally unset until Phase 5.3–5.6 land real tests.
  // Blueprint §12 targets: services 90%, repos 60%, controllers 50%.
};
