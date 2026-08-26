import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone React 18 prototype served by Babel from a static HTML file.
    // It is design reference, not app code, and does not lint as a module.
    "references/**",
  ]),
  // Disable ESLint rules that conflict with Prettier formatting.
  prettier,
]);

export default eslintConfig;
