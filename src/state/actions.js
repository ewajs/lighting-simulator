import { getProduct } from '../data/catalog.js';

/** All state mutations go through here. UI and scene code call these, never store.set directly. */
export function createActions(store) {
  const s = () => store.get();
  let seq = 0;
  const newId = () => `lum_${Date.now().toString(36)}_${(seq++).toString(36)}`;

  const nextName = (base) => {
    const taken = new Set(s().luminaires.map((l) => l.name));
    let n = 1;
    while (taken.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  };

  /** Default mounting position for a product in the current room. */
  function defaultPosition(product) {
    const { height } = s().room;
    switch (product.mount) {
      case 'pendant': return [0, height - (product.drop ?? 0.8), 0];
      case 'wall': return [0, Math.min(1.8, height - 0.3), -s().room.depth / 2];
      case 'floor':
      case 'table': return [0, 0, 0];
      default: return [0, height, 0];
    }
  }

  const updateLuminaires = (label, ids, fn, opts) => {
    const set = new Set(ids);
    store.commit(label, { luminaires: s().luminaires.map((l) => (set.has(l.id) ? { ...l, ...fn(l) } : l)) }, opts);
  };

  return {
    // ---- project / room ----
    renameProject: (name) => store.commit('Rename project', { project: { ...s().project, name } }, { coalesce: 'project-name' }),

    setRoom(patch) {
      const room = { ...s().room, ...patch };
      // Keep fixtures inside the room and attached to the ceiling when height changes.
      const luminaires = s().luminaires.map((l) => {
        const p = getProduct(l.productId);
        const [x, y, z] = l.position;
        const hx = room.width / 2, hz = room.depth / 2;
        const ny = p?.mount === 'recessed' || p?.mount === 'track' ? room.height
          : p?.mount === 'pendant' ? Math.min(y, room.height - 0.1) : y;
        return { ...l, position: [clamp(x, -hx, hx), ny, clamp(z, -hz, hz)] };
      });
      store.commit('Edit room', { room, luminaires }, { coalesce: `room-${Object.keys(patch).join()}` });
    },

    setSurface(surface, patch) {
      const room = s().room;
      store.commit('Edit surface', {
        room: { ...room, surfaces: { ...room.surfaces, [surface]: { ...room.surfaces[surface], ...patch } } },
      }, { coalesce: `surface-${surface}` });
    },

    // ---- luminaires ----
    /** `at` is an optional [x, z] floor point; height comes from the mount type. */
    addLuminaire(productId, at) {
      const product = getProduct(productId);
      if (!product) return;
      const position = defaultPosition(product);
      if (at) [position[0], position[2]] = at;
      if (at && product.mount === 'wall') snapToWall(position, s().room);
      const lum = {
        id: newId(),
        productId,
        name: nextName(product.name),
        position,
        aim: { tilt: 0, pan: 0 },
        dimming: 1,
        on: true,
        cct: product.cct,
      };
      store.commit(`Add ${product.name}`, { luminaires: [...s().luminaires, lum] });
      store.set({ selection: [lum.id] });
      return lum.id;
    },

    updateLuminaire: (id, patch, key) =>
      updateLuminaires('Edit luminaire', [id], () => patch, { coalesce: key ? `${id}-${key}` : undefined }),

    updateMany: (ids, patch, key) =>
      updateLuminaires('Edit luminaires', ids, () => patch, { coalesce: key ? `${ids.join()}-${key}` : undefined }),

    toggleSelected() {
      const ids = s().selection;
      const anyOn = s().luminaires.some((l) => ids.includes(l.id) && l.on);
      updateLuminaires(anyOn ? 'Turn off' : 'Turn on', ids, () => ({ on: !anyOn }));
    },

    removeSelected() {
      const ids = new Set(s().selection);
      if (!ids.size) return;
      store.commit('Delete', { luminaires: s().luminaires.filter((l) => !ids.has(l.id)) });
      store.set({ selection: [] });
    },

    duplicateSelected() {
      const ids = new Set(s().selection);
      if (!ids.size) return;
      const copies = s().luminaires
        .filter((l) => ids.has(l.id))
        .map((l) => {
          const product = getProduct(l.productId);
          const [x, y, z] = l.position;
          const hx = s().room.width / 2;
          return { ...l, id: newId(), name: nextName(product?.name ?? 'Luminaire'), position: [clamp(x + 0.5, -hx, hx), y, z] };
        });
      store.commit('Duplicate', { luminaires: [...s().luminaires, ...copies] });
      store.set({ selection: copies.map((c) => c.id) });
    },

    // ---- selection / view / ui (not undoable) ----
    select: (ids) => store.set({ selection: ids }),
    toggleInSelection(id) {
      const sel = s().selection;
      store.set({ selection: sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id] });
    },
    setView: (patch) => store.set({ view: { ...s().view, ...patch } }),
    setUi: (patch) => store.set({ ui: { ...s().ui, ...patch } }),

    undo: () => store.undo(),
    redo: () => store.redo(),
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Move a wall-mounted point onto the closest wall. */
function snapToWall(pos, room) {
  const hx = room.width / 2, hz = room.depth / 2;
  const [x, , z] = pos;
  const d = [hz + z, hz - z, hx + x, hx - x];
  const i = d.indexOf(Math.min(...d));
  if (i === 0) pos[2] = -hz;
  else if (i === 1) pos[2] = hz;
  else if (i === 2) pos[0] = -hx;
  else pos[0] = hx;
}
