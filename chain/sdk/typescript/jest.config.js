/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Discover test files anywhere under src/
  testMatch: ["<rootDir>/src/**/*.test.ts"],

  // TypeScript compilation settings for Jest
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax strict settings that ts-jest requires for test files
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },

  // Global timeout for all tests (can be overridden per-file with jest.setTimeout)
  testTimeout: 30000,

  // Collect coverage from src (excluding test files themselves)
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
  ],

  // Module name mapper – helps resolve "@cosmjs/*" packages in tests
  moduleNameMapper: {},

  // Clear mock state between tests
  clearMocks: true,
  restoreMocks: true,
};

module.exports = config;
