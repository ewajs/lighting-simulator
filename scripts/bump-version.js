// Sets one version on every package in the repo, and on the dependencies
// between them (ADR 0077): `npm run bump -- 0.5.1`. The packages share one
// version because they're consumed together, from source (ADR 0017). Then
// `npm install` brings package-lock.json up to date.
// A Node script; ESLint here only knows browser-neutral globals.
/* global console, process */
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('Usage: npm run bump -- <major.minor.patch>');
  process.exit(1);
}

const manifests = [
  'package.json',
  'packages/core/package.json',
  'packages/ui/package.json',
  'apps/demo/package.json',
  'apps/manual/package.json',
  'accuracy/typescript/package.json',
];
for (const path of manifests) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.version = version;
  for (const field of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (name.startsWith('@luxstudio/')) manifest[field][name] = version;
    }
  }
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`Every package is at ${version}. Now run npm install, and add a line to CHANGELOG.md.`);
