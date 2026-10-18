import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      ".build-temp/**",
      "dist-electron/**",
      "release/**",
      ".pnpm-store/**",
      "node_modules/**",
      "**/.venv/**",
      "backend/**",
      "uploads/**",
      "exports/**",
      "reports/**",
      "**/Untitled-1*",
      "scripts/**"
      ,"scratch/**",
      "tmp/**",
      "bol-ledger/**",
      "awesome-claude-code-subagents/**",
      "backups_pre_improvement_*/**"
    ]
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: false },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "valid-typeof": "error",
    },
  },
];
