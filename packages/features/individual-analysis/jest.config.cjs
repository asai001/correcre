module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          types: ["node", "jest"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@correcre/lib$": "<rootDir>/../../lib/src/index.ts",
    "^@correcre/types$": "<rootDir>/../../types/src/index.ts",
  },
};
