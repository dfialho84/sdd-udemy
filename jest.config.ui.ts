import type { Config } from "jest";

// Configuracao Jest para testes de componentes React (UI)
// Usa jsdom como ambiente de teste para simular o DOM do navegador.
// Rastreabilidade: UT-9 (HomePage) · UT-10 (RegisterPage)
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Opcoes inline garantem que jsx=react-jsx e sempre aplicado,
        // independente de cache ou heranca de tsconfig.
        // Raiz do problema: tsconfig.json base tem "jsx": "preserve" que e
        // incompativel com Node.js/Jest — o ts-jest precisa de "react-jsx".
        tsconfig: {
          jsx: "react-jsx",
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          paths: {
            "@/*": ["./src/*"],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next/link$": "<rootDir>/src/__tests__/ui/__mocks__/next-link-mock.tsx",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/__tests__/ui/__mocks__/style-mock.js",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/src/__tests__/ui/__mocks__/file-mock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/ui/jest-setup.ts"],
  testMatch: ["<rootDir>/src/__tests__/ui/**/*.test.tsx"],
  passWithNoTests: true,
};

export default config;
