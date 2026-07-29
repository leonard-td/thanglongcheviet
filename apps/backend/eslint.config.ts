import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

export default defineConfig([
  ...medusa.configs.recommended,
  {
    ignores: [
      ".medusa/**",
      "node_modules/**",
      "static/**",
      "coverage/**",
      "dist/**",
    ],
  },
])
