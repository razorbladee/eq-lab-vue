import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.es2025, STOPS: 'readonly' },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': 'off',
      'vue/no-mutating-props': 'off',
      'vue/require-default-prop': 'off',
      'vue/attributes-order': 'off',
      'vue/require-explicit-emits': 'off',
      'vue/no-ref-as-operand': 'off',
    },
  },
  prettier,
];
