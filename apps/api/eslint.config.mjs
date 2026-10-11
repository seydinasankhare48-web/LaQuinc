import base from '@laquinc/config/eslint';

// Le contexte tenant est posé par set_config : un SQL injecté pourrait le modifier.
// Interdit dans l'API : SQL brut construit à la main (sql.raw, .unsafe).
export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='unsafe']",
          message: 'Raw SQL (.unsafe) is forbidden in apps/api: use Drizzle query builders (see docs/security.md).',
        },
        {
          selector: "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
          message: 'sql.raw is forbidden in apps/api: use parameterized queries (see docs/security.md).',
        },
      ],
    },
  },
];
