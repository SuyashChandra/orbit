import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm'],
  outDir: 'dist',
  splitting: false,
  // Bundle @orbit/shared so the runner stage doesn't need its .ts source
  noExternal: ['@orbit/shared'],
});
