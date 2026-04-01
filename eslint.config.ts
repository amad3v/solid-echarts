import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import type { Linter } from "eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

const tseslintConfig: Linter.Config = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: {
    "@typescript-eslint": tseslint.plugin,
  },

  rules: {
    /**
     * Core correctness
     */
    "no-undef": "off",
    "no-unused-vars": "off",

    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],

    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: true,
      },
    ],

    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unnecessary-condition": [
      "error",
      {
        allowConstantLoopConditions: false,
      },
    ],

    /**
     * Strict typing discipline
     */
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      },
    ],

    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-argument": "error",

    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true,
        allowBoolean: false,
        allowAny: false,
        allowNullish: false,
      },
    ],

    /**
     * Exhaustiveness & control flow
     */
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",

    /**
     * API clarity
     */
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],

    "@typescript-eslint/explicit-module-boundary-types": "error",

    /**
     * Consistency
     */
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/method-signature-style": ["error", "property"],

    /**
     * Prevent footguns
     */
    "@typescript-eslint/no-confusing-void-expression": "error",
    "@typescript-eslint/require-await": "error",
  },

  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: true,
      tsconfigRootDir,
    },
  },
};

const vitestConfig: Linter.Config = {
  files: ["tests/**/*.{ts,tsx}"], // or any other pattern
  plugins: {
    vitest,
  },
  rules: {
    ...vitest.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
    "vitest/max-nested-describe": ["error", { max: 3 }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
};

const jsConfig = {
  files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
  plugins: { js },
  extends: ["js/recommended"],
  languageOptions: { globals: globals.browser },
};

const ignorePatterns = globalIgnores([
  "node_modules",
  "dist",
  "build",
  "out",
  "pnpm-lock.yaml",
  "*.config.*",
  "coverage",
]);

export default defineConfig([
  jsConfig,
  tseslint.configs.recommended,
  tseslintConfig,
  vitestConfig,
  ignorePatterns,
]);
