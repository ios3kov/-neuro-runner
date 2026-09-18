import parser from '@typescript-eslint/parser';
export default [
  {ignores:['node_modules/**','dist/**','audit-results/**']},
  {files:['**/*.{ts,tsx,mjs}'],languageOptions:{parser,parserOptions:{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}}},rules:{'no-debugger':'error','no-duplicate-case':'error','no-unreachable':'error','no-unsafe-finally':'error','no-cond-assign':['error','always'],'valid-typeof':'error','constructor-super':'error'}}
];
