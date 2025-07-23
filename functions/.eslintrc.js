module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
    "react",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": "off",
    "indent": ["error", 2],
    "max-len": [
      "error",
      {
        "code": 80,
        "tabWidth": 2,
        "ignoreComments": true,
        "ignoreUrls": true,
      },
    ],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "camelcase": "off",

    // Tambahan untuk menghindari error runtime
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-expressions": "off", // MATIKAN aturan yang error
  },
};
