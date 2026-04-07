import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
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
  // Testes de componentes React (.tsx) ficam em src/__tests__/ui/ e rodam
  // exclusivamente via jest.config.ui.ts (que tem jsdom + jsx:react-jsx).
  // O jest.config.ts principal usa node environment sem suporte a JSX.
  testPathIgnorePatterns: ["/node_modules/", "/cypress/", "/src/__tests__/ui/"],
};

export default config;
