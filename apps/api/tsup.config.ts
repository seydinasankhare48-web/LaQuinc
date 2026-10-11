import { defineConfig } from 'tsup';

// Les paquets du workspace (@laquinc/*) sont en TypeScript source : on les inclut dans le bundle.
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  sourcemap: true,
  clean: true,
  noExternal: [/^@laquinc\//],
});
