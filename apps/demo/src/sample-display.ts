import type { DisplayCatalog } from '@luxstudio/ui';

type Labels = Record<'es-AR' | 'en', string>;

const CATEGORIES: { id: string; label: Labels }[] = [
  { id: 'recessed', label: { 'es-AR': 'Embutidos', en: 'Recessed' } },
  { id: 'pendant', label: { 'es-AR': 'Colgantes', en: 'Pendants' } },
  { id: 'track', label: { 'es-AR': 'Rieles', en: 'Track' } },
  { id: 'wall', label: { 'es-AR': 'Apliques', en: 'Wall' } },
  { id: 'floor', label: { 'es-AR': 'De pie y de mesa', en: 'Floor & table' } },
];

const ITEMS: { productId: string; categoryId: string; name: Labels }[] = [
  {
    productId: 'downlight-7w',
    categoryId: 'recessed',
    name: { 'es-AR': 'Downlight 7 W', en: 'Downlight 7 W' },
  },
  {
    productId: 'pendant-48w',
    categoryId: 'pendant',
    name: { 'es-AR': 'Colgante 48 W', en: 'Pendant 48 W' },
  },
  {
    productId: 'track-spot-12w',
    categoryId: 'track',
    name: { 'es-AR': 'Spot de riel 12 W', en: 'Track spot 12 W' },
  },
  {
    productId: 'wall-light-6w',
    categoryId: 'wall',
    name: { 'es-AR': 'Aplique 6 W', en: 'Wall light 6 W' },
  },
  {
    productId: 'floor-lamp-9w',
    categoryId: 'floor',
    name: { 'es-AR': 'Lámpara de pie 9 W', en: 'Floor lamp 9 W' },
  },
  {
    productId: 'table-lamp-5w',
    categoryId: 'floor',
    name: { 'es-AR': 'Lámpara de mesa 5 W', en: 'Table lamp 5 W' },
  },
  {
    productId: 'ies-downlight',
    categoryId: 'recessed',
    name: { 'es-AR': 'Downlight 16 W (IES)', en: 'Downlight 16 W (IES)' },
  },
  {
    productId: 'ies-wall-washer',
    categoryId: 'recessed',
    name: { 'es-AR': 'Bañador de pared 14 W (IES)', en: 'Wall washer 14 W (IES)' },
  },
  {
    productId: 'ies-linear-pendant',
    categoryId: 'pendant',
    name: {
      'es-AR': 'Colgante lineal directo/indirecto 47 W (IES)',
      en: 'Linear pendant, direct/indirect 47 W (IES)',
    },
  },
  {
    productId: 'ies-track-spot',
    categoryId: 'track',
    name: { 'es-AR': 'Spot de riel 18° 40 W (IES)', en: 'Track spot 18° 40 W (IES)' },
  },
  {
    productId: 'ies-wall-up-down',
    categoryId: 'wall',
    name: { 'es-AR': 'Aplique arriba/abajo 18 W (IES)', en: 'Up/down wall light 18 W (IES)' },
  },
];

/** Display data for the sample products, in the given language. */
export function sampleDisplay(locale: keyof Labels): DisplayCatalog {
  return {
    categories: CATEGORIES.map(({ id, label }) => ({ id, label: label[locale] })),
    items: ITEMS.map(({ productId, categoryId, name }) => ({
      productId,
      categoryId,
      name: name[locale],
    })),
  };
}
