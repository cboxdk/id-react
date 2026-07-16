// Prepend the `'use client'` directive to the built JS entrypoints. The whole
// package is client components; esbuild strips a module-level directive when it
// bundles, so a tsup banner won't survive — we add it here after the build.
import { readFile, writeFile } from 'node:fs/promises';

const DIRECTIVE = "'use client';\n";
const files = ['dist/index.js', 'dist/index.cjs'];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (!source.startsWith("'use client'") && !source.startsWith('"use client"')) {
    await writeFile(file, DIRECTIVE + source);
  }
}

console.log(`add-use-client: prefixed ${files.length} files`);
