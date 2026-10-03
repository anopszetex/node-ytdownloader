export default [
  {
    files: ["src/**/*.js", "test/**/*.js", "scripts/**/*.js"],
    rules: {
      complexity: ["error", 8],
      curly: ["error", "all"],
      "max-depth": ["error", 2],
      "no-nested-ternary": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "IfStatement[alternate]",
          message: "Use guard clauses instead of else or else if.",
        },
        {
          selector: "SwitchStatement",
          message: "Use data maps or small functions instead of switch.",
        },
        {
          selector: "DoWhileStatement",
          message: "Use an explicit condition without do...while.",
        },
      ],
    },
  },
];
