import type { SurfaceName, TextureProvider } from '@luxstudio/core';
import type { SurfaceMaterial } from '@luxstudio/ui';

type Labels = Record<'es-AR' | 'en', string>;

/**
 * Surface materials served from public/textures/ (see SOURCES.md there):
 * CC0 photos from ambientCG. A backend integration works the same way, e.g.
 * a flooring catalogue mapping each finish to its photo's download link.
 */
const MATERIALS: {
  id: string;
  name: Labels;
  /** How much floor or wall one copy of the photo covers, in m (from ambientCG). */
  widthM: number;
  heightM: number;
  /** Typical diffuse reflectance of the real material. */
  reflectance: number;
  surfaces: SurfaceName[];
}[] = [
  {
    id: 'oak-planks',
    name: { 'es-AR': 'Piso de roble', en: 'Oak planks' },
    widthM: 1.8,
    heightM: 1.8,
    reflectance: 0.3,
    surfaces: ['floor'],
  },
  {
    id: 'stone-tiles',
    name: { 'es-AR': 'Baldosas de piedra', en: 'Stone tiles' },
    widthM: 2,
    heightM: 2,
    reflectance: 0.5,
    surfaces: ['floor'],
  },
  {
    id: 'white-tiles',
    name: { 'es-AR': 'Azulejos blancos', en: 'White tiles' },
    widthM: 1,
    heightM: 1,
    reflectance: 0.75,
    surfaces: ['floor', 'walls'],
  },
  {
    id: 'concrete',
    name: { 'es-AR': 'Hormigón alisado', en: 'Smooth concrete' },
    widthM: 1.1,
    heightM: 0.55,
    reflectance: 0.4,
    surfaces: ['floor', 'walls', 'ceiling'],
  },
  {
    id: 'plaster',
    name: { 'es-AR': 'Revoque', en: 'Plaster' },
    widthM: 2,
    heightM: 2,
    reflectance: 0.75,
    surfaces: ['walls', 'ceiling'],
  },
  {
    id: 'red-brick',
    name: { 'es-AR': 'Ladrillo visto', en: 'Red brick' },
    widthM: 2.4,
    heightM: 1.2,
    reflectance: 0.25,
    surfaces: ['walls'],
  },
];

const url = (file: string) => new URL(`textures/${file}`, document.baseURI);

export const sampleTextures: TextureProvider = {
  async load(textureId) {
    const material = MATERIALS.find((m) => m.id === textureId);
    if (!material) return undefined;
    const response = await fetch(url(`${textureId}.jpg`));
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${response.url}`);
    const { widthM, heightM } = material;
    return { data: await response.arrayBuffer(), widthM, heightM };
  },
};

/** The materials as the room panel offers them, in the given language. */
export function sampleMaterials(locale: keyof Labels): SurfaceMaterial[] {
  return MATERIALS.map(({ id, name, reflectance, surfaces }) => ({
    textureId: id,
    name: name[locale],
    thumbnailUrl: url(`${id}-thumb.jpg`).href,
    reflectance,
    surfaces,
  }));
}
