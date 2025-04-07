/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@electron-toolkit/eslint-config-ts/recommended',
    '@vue/eslint-config-typescript/recommended'
  ],
  rules: {
    // 关闭一些烦人的规则
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'vue/multi-word-component-names': 'off',
    'no-unused-vars': 'off',
    'no-console': 'off',
    'prefer-const': 'off'
  }
}
