export const SURFACE_PRESETS = [
  { id: 'white', name: 'White paint', color: '#f2f0ec', reflectance: 0.8 },
  { id: 'warm', name: 'Warm grey', color: '#cbc3b8', reflectance: 0.6 },
  { id: 'concrete', name: 'Concrete', color: '#9a9893', reflectance: 0.4 },
  { id: 'oak', name: 'Oak floor', color: '#8a6a4a', reflectance: 0.3 },
  { id: 'dark', name: 'Charcoal', color: '#2d2d2f', reflectance: 0.1 },
];

export function createInitialState() {
  return {
    project: { name: 'Untitled scene' },
    room: {
      width: 5,
      depth: 4,
      height: 2.7,
      surfaces: {
        floor: { color: '#8a6a4a', reflectance: 0.3 },
        walls: { color: '#f2f0ec', reflectance: 0.8 },
        ceiling: { color: '#f7f6f3', reflectance: 0.85 },
      },
    },
    /** @type {Array<{id:string, productId:string, name:string, position:[number,number,number], aim:{tilt:number, pan:number}, dimming:number, on:boolean, cct:number}>} */
    luminaires: STARTER_LUMINAIRES,
    selection: [],
    view: {
      renderMode: 'realistic', // 'realistic' | 'clay' | 'illuminance'
      exposure: 0, // EV stops relative to the calibrated base
      preset: 'perspective',
    },
    ui: {
      theme: 'dark',
      leftTab: 'catalog',
      leftCollapsed: false,
      rightCollapsed: false,
    },
  };
}

// A small starter layout so the first view is lit: a pendant over the centre
// and four recessed downlights.
const lum = (id, productId, name, position, extra = {}) => ({
  id, productId, name, position, aim: { tilt: 0, pan: 0 }, dimming: 1, on: true, cct: 3000, ...extra,
});
const STARTER_LUMINAIRES = [
  lum('lum_start_0', 'yasas-negro', 'YASAS 1', [0, 1.8, 0]),
  lum('lum_start_1', 'seb-1-negro', 'SEB 1 1', [-1.5, 2.7, -1.1]),
  lum('lum_start_2', 'seb-1-negro', 'SEB 1 2', [1.5, 2.7, -1.1]),
  lum('lum_start_3', 'seb-1-negro', 'SEB 1 3', [-1.5, 2.7, 1.1]),
  lum('lum_start_4', 'seb-1-negro', 'SEB 1 4', [1.5, 2.7, 1.1]),
];
