import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const files = (await readdir(dist, { recursive: true })).filter((file) =>
  file.endsWith('.js'),
);
const sizes = await Promise.all(
  files.map(
    async (file) => gzipSync(await readFile(join(dist, file))).byteLength,
  ),
);
const bytes = sizes.reduce((total, size) => total + size, 0);
console.log(
  `JavaScript gzip total: ${(bytes / 1000).toFixed(2)} kB (${files.length} files; target < 600 kB).`,
);
