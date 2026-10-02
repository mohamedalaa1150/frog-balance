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

const assetFiles = (
  await readdir(join(dist, 'assets'), { recursive: true })
).filter(
  (f) => /\.(webp|svg|woff2?|mp3)$/.test(f) && !f.startsWith('audio/music/'),
);
// Preload currently loads the complete local art pack; include it in the first-load budget.
const assetBytes = (
  await Promise.all(
    assetFiles.map(
      async (f) => (await readFile(join(dist, 'assets', f))).byteLength,
    ),
  )
).reduce((sum, n) => sum + n, 0);
console.log(
  `First-load upper bound: ${((bytes + assetBytes) / 1_000_000).toFixed(2)} MB (all preload art/fonts/audio; target < 8 MB).`,
);
if (bytes >= 600_000 || bytes + assetBytes >= 8_000_000) process.exitCode = 1;
