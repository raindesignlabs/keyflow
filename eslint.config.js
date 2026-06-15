import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "drizzle/"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow unused args prefixed with _ (common in route handlers)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Don't force explicit return types everywhere
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
