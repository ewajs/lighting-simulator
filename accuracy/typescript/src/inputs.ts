// The comparison's inputs: the references accuracy/python wrote, and the
// demo's real IES files they were made from, read through Vite's glob imports.
import type { Reference } from './compare';

const referenceFiles = import.meta.glob<Reference>('../../references/*.json', {
  eager: true,
  import: 'default',
});
const iesTexts = import.meta.glob<string>('../../../apps/demo/public/ies/*.ies', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** File name without its folder, e.g. `qg63_b35q.ies`. */
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Each reference room, by name: `single-downlight` and so on. */
export const REFERENCES: Readonly<Record<string, Reference>> = Object.fromEntries(
  Object.entries(referenceFiles).map(([path, reference]) => [
    fileName(path).replace(/\.json$/, ''),
    reference,
  ]),
);

/** The demo's IES files' text, by file name. */
export const IES_FILES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(iesTexts).map(([path, text]) => [fileName(path), text]),
);
