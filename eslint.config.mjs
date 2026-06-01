import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This project consumes many heterogeneous OSINT/live-data APIs where
      // response schemas vary by source. Keep these visible during cleanup, but
      // do not block production builds on legacy dynamic response shapes.
      "@typescript-eslint/no-explicit-any": "warn",

      // The current UI uses imperative map/camera integration patterns. Treat
      // React Compiler advisory rules as warnings while preserving the stable
      // runtime behaviour of the deployed app.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
