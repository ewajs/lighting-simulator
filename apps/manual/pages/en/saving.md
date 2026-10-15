# Saving and opening

While you work, the scene **saves itself** in this browser. If you close
the tab or the computer shuts down, it's there as you left it when you come
back. To keep it elsewhere, or send it, save it to a file.

## New scene

![New scene: an empty room and templates, each with its floor plan](/screenshots/en/new-scene.png)

**New** (the page with a +, at the top) opens the templates: an **empty
room** and ready-made rooms, such as a dining room, a living room, a
bedroom, a home office or a shop, each with its floor plan. Pick one and it replaces the
scene; if it was a mistake, **⌘Z** brings the previous one back.

## Files

- **Save** (the disk at the top, or **⌘S**) downloads the scene as a
  `.luxstudio.json` file, e.g. `scene-2026-10-14-1830.luxstudio.json`. It
  keeps the room with its size and materials, the luminaires with their
  position, aim and dimming, and the furniture.
- **Open** (the folder, or **⌘O**) loads a saved file. You can also **drop**
  it onto the 3D view.

Opening replaces the current scene. If it was a mistake, **⌘Z** brings it
back.

On a phone, New, Save and Open are in the **⋯** menu.

### When a file won't open

A notice at the bottom left says what happened, and the scene doesn't
change:

- **not a scene file:** for example, another JSON file;
- **saved by a newer version:** update the app to open it;
- **damaged:** something is missing or has a value that doesn't fit.

### Products the catalog doesn't have

A file stores which product each luminaire is, not its data: that comes
from the catalog. If you open a file with products this catalog doesn't have
(from another catalog, or an IES file you loaded on another visit), the
notice says how many luminaires that is. They stay in the scene, not drawn,
and are saved again with it.
