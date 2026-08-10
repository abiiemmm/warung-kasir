import { defineConfig, globalIgnores } from "eslint/config"
import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default defineConfig([
  { files: ["src/**/*.ts"], extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores(["node_modules/**", "dist/**"]),
])
