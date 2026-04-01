import { defineConfig } from "oxfmt";

export default defineConfig({
  semi: true,
  trailingComma: "all",
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  arrowParens: "always",
  htmlWhitespaceSensitivity: "ignore",
  bracketSpacing: true,
  bracketSameLine: false,
  quoteProps: "as-needed",
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    partitionByNewline: false,
    partitionByComment: false,
    sortSideEffects: false,
    internalPattern: ["@ctx/**", "@primitive/**", "@type/**", "@utils/**"],
    customGroups: [
      {
        groupName: "solid-libs",
        elementNamePattern: ["solid-js", "solid-**"],
      },
    ],
    groups: [
      "solid-libs",
      "builtin",
      "external",
      ["internal", "subpath"],
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
  },
  ignorePatterns: ["node_modules", "dist", "build", "out", "pnpm-lock.yaml"],
});
