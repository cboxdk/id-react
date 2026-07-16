import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  // The `'use client'` directive is added post-build (scripts/add-use-client.mjs):
  // esbuild strips a module-level directive from a bundle, so a banner won't survive.
});
