import solid from "rolldown-plugin-solid";
import { defineConfig } from "tsdown";

// export both js and jsx
export default defineConfig([
  {
    platform: "neutral",
    // use the solid plugin to handle jsx
    plugins: [solid()],
  },
  {
    platform: "neutral",
    // no plugin: JSX is kept as-is through `compilerOptions.jsx: "preserve"` in `tsconfig.json`
    outExtensions: () => ({ js: ".jsx" }),
  },
]);
