# 0053. Share links through a scene storage; the demo's links carry the scene

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

SPEC §1 says a scene can be "sent as a link", and §4.6 asks for saving and
sharing through a storage provider the host supplies. After M4.1 and M4.2
(ADRs 0051, 0052) scenes can be saved to files and are autosaved, but
sending one meant attaching a file. The demo has no backend.

## Options

- **The interface:** core defines a `SceneStorage` the UI calls / each host
  wires a share button of its own
- **The demo's links:** the scene inside the link / a hosted pastebin-like
  service / no sharing until a backend exists
- **Opening a link:** one undo step on top of the user's scene / replacing
  it as the starting scene
- **Handing the link over:** clipboard / the system share sheet / both

## Decision

- **`SceneStorage`** in core, next to the other providers:
  - `share(file)` keeps a scene file and returns a link that opens a copy;
  - `open(link)` returns `{ file, pageLink }` for a link to a scene, or
    undefined.

  It stores scene files (ADR 0051), so a scene's version travels with it. A
  backend would POST the file and put an id in the link (the "backend
  adapter" under Later).
- **`<lxs-app>.storage`:** with one, the top bar offers **Share** (phones: ⋯).
  At start-up the app asks it once about the page's own address:
  - A shared scene opens as **one undo step on top of the user's own scene**
    (their autosave or the starter), with the notice "Opened a shared scene.
    Undo brings yours back." Replacing it outright would quietly overwrite
    the recipient's autosaved work as soon as they edited.
  - The address bar is then set to `pageLink`, so a reload keeps their edits
    instead of opening the link again.
  - It waits for the UI's language to load first, so the notice isn't in
    English on a Spanish page.
- **Share** hands the link over through the system share sheet on phones
  where there is one. Otherwise it goes to the clipboard, with a notice. If
  the clipboard refuses, the notice shows the link in a read-only field to
  copy by hand.
- **The demo's links carry the scene**, after `#scene=`:
  - the scene file is compressed with the browser's `CompressionStream`
    (deflate) and written as base64url, with no dependency
    (`apps/demo/src/link-storage.ts`);
  - the part after `#` never reaches a server, so it works on GitHub Pages
    and stays between the people who have the link;
  - measured: the starter scene's link is 1.3 KB, 50 luminaires about
    2.9 KB, 100 about 5.1 KB, mostly the random ids.

## Consequences

- New public API:
  - core: `SceneStorage`, `SharedScene`;
  - UI: `<lxs-app>.storage`, `lxs-share-request` and `canShare` on the top
    bar, `Notice.copyable`.
- The demo gets unit tests (Vitest, `src/` only) for packing and unpacking
  links.
- A demo link can't be updated or revoked once sent; a backend's could.
- Like files, links store product ids: they open fully only with the same
  catalog, and imported IES files aren't included.
- On iPhones, Safari may refuse the share sheet or the clipboard after the
  asynchronous packing ends the user's gesture. The fallback shows the link
  to copy by hand. Not yet checked on a real phone.
