import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    files: ["**/*.{ts}"],
    ignores: ["build/**/*.*", "**/src/main/resources/admin/tools/part-finder/editor/regionEditing/index.ts"],
    rules: {
      "no-unused-vars": "off",
      "no-use-before-define": "off",
    },
  },
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended
];
