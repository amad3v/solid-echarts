import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solidPlugin()],

  resolve: {
    tsconfigPaths: true,
    conditions: ["browser", "development"],
  },
  test: {
    root: ".",
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "tests/**", // exclude all test files
        "node_modules/**",
        "**/*.d.ts",
      ],
    },
  },
});
