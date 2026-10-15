import type { SceneStorage } from '@luxstudio/core';

// Share links without a backend (ADR 0053): the scene file itself, compressed
// with the browser's deflate and encoded for URLs, after `#scene=`. The part
// after `#` never reaches a server, so the scene stays between the people who
// have the link. A backend would store the file and put an id in the link instead.

/** The fragment parameter that holds a shared scene. */
const PARAM = 'scene';

/** Scenes kept in the link itself. */
export const linkStorage: SceneStorage = {
  async share(file) {
    const url = new URL(location.href);
    url.hash = `${PARAM}=${await pack(file)}`;
    return url.href;
  },

  async open(link) {
    const url = new URL(link);
    const packed = new URLSearchParams(url.hash.slice(1)).get(PARAM);
    if (!packed) return undefined;
    url.hash = '';
    return { file: await unpack(packed), pageLink: url.href };
  },
};

/** Text compressed and written as base64url: letters, digits, `-` and `_`. */
export async function pack(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** The text `pack` made. Throws if `packed` isn't such text. */
export async function unpack(packed: string): Promise<string> {
  const binary = atob(packed.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}
