import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/ports/**/*.ts",
    "src/adapters/**/*.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/cypress/"],
};

export default config;
