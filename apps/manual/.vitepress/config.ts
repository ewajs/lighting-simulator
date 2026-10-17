import { defineConfig, type DefaultTheme } from 'vitepress';
import { ROOM_ORDER, ROOMS, type Lang } from './theme/analysis/names';

const DEMO_URL = 'https://ewajs.github.io/lighting-simulator/';

/** The sidebar, in each language. Slugs differ by language; the structure doesn't. */
function sidebar(
  prefix: string,
  t: {
    lang: Lang;
    start: string;
    use: string;
    concepts: string;
    analysis: string;
    rooms: string;
    more: string;
    pages: Record<string, [slug: string, title: string]>;
  },
): DefaultTheme.SidebarItem[] {
  const item = (key: string) => {
    const [slug, text] = t.pages[key]!;
    return { text, link: `${prefix}${slug}` };
  };
  return [
    { text: t.start, items: [item('start')] },
    {
      text: t.use,
      items: ['luminaires', 'moving', 'aiming', 'light', 'furniture', 'room', 'views'].map(item),
    },
    {
      text: t.concepts,
      items: [
        'units',
        'polar',
        'laws',
        'workPlane',
        'uniformity',
        'maintenance',
        'levels',
        'howItCalculates',
      ].map(item),
    },
    {
      text: t.analysis,
      items: [
        ...['standing', 'features', 'speed', 'method'].map(item),
        {
          text: t.rooms,
          collapsed: true,
          // One page per reference room, from analisis/[room].md (ADR 0062).
          items: ROOM_ORDER.map((id) => ({
            text: ROOMS[id]![t.lang].name,
            link: `${prefix}${t.pages.standing![0].replace(/\/$/, '')}/${id}`,
          })),
        },
      ],
    },
    {
      text: t.more,
      items: ['files', 'ies', 'screenshots', 'touch', 'shortcuts', 'help'].map(item),
    },
  ];
}

export default defineConfig({
  title: 'Lux Studio',
  description: 'Manual de Lux Studio',
  // Served next to the demo on GitHub Pages; built into the demo's output.
  base: '/lighting-simulator/manual/',
  srcDir: 'pages',
  outDir: '../demo/dist/manual',
  cleanUrls: false,
  lastUpdated: false,
  head: [['link', { rel: 'icon', href: 'data:,' }]],
  markdown: { math: true },

  locales: {
    root: {
      label: 'Español',
      lang: 'es-AR',
      description: 'Manual de Lux Studio: cómo armar un ambiente y ver la luz.',
      themeConfig: {
        nav: [{ text: 'Abrir Lux Studio', link: DEMO_URL }],
        sidebar: sidebar('/', {
          lang: 'es',
          start: 'Empezar',
          use: 'Usar Lux Studio',
          concepts: 'Conceptos',
          analysis: 'Análisis',
          rooms: 'Ambientes de prueba',
          more: 'Más',
          pages: {
            start: ['primeros-pasos', 'Primeros pasos'],
            luminaires: ['luminarias', 'Agregar y elegir luminarias'],
            moving: ['mover', 'Mover'],
            aiming: ['orientar', 'Orientar'],
            light: ['luz', 'Ajustar la luz'],
            furniture: ['mobiliario', 'Mobiliario'],
            room: ['ambiente', 'El ambiente'],
            views: ['vista', 'La vista'],
            units: ['conceptos/unidades', 'Luz y unidades'],
            polar: ['conceptos/curvas-polares', 'Archivos IES y curvas polares'],
            laws: ['conceptos/distancia-y-angulo', 'Distancia y ángulo'],
            workPlane: ['conceptos/plano-de-trabajo', 'El plano de trabajo'],
            uniformity: ['conceptos/uniformidad', 'Uniformidad'],
            maintenance: ['conceptos/mantenimiento', 'Factor de mantenimiento'],
            levels: ['conceptos/niveles', 'Niveles recomendados'],
            howItCalculates: ['conceptos/como-calcula', 'Cómo calcula Lux Studio'],
            standing: ['analisis/', 'Dónde estamos'],
            features: ['analisis/funcion-por-funcion', 'Función por función'],
            speed: ['analisis/velocidad', 'Velocidad'],
            method: ['analisis/metodo', 'Cómo comparamos'],
            files: ['guardar', 'Guardar, abrir y compartir'],
            ies: ['archivos-ies', 'Tus archivos IES'],
            screenshots: ['capturas', 'Capturas'],
            touch: ['celulares-y-tablets', 'Celulares y tablets'],
            shortcuts: ['atajos', 'Atajos de teclado'],
            help: ['problemas', 'Si algo no anda'],
          },
        }),
        outline: { label: 'En esta página' },
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        darkModeSwitchLabel: 'Apariencia',
        lightModeSwitchTitle: 'Cambiar a tema claro',
        darkModeSwitchTitle: 'Cambiar a tema oscuro',
        sidebarMenuLabel: 'Menú',
        returnToTopLabel: 'Volver arriba',
        langMenuLabel: 'Idioma',
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      description: 'Lux Studio manual: how to lay out a room and see the light.',
      themeConfig: {
        nav: [{ text: 'Open Lux Studio', link: DEMO_URL }],
        sidebar: sidebar('/en/', {
          lang: 'en',
          start: 'Start',
          use: 'Using Lux Studio',
          concepts: 'Concepts',
          analysis: 'Analysis',
          rooms: 'Test rooms',
          more: 'More',
          pages: {
            start: ['getting-started', 'Getting started'],
            luminaires: ['luminaires', 'Adding and picking luminaires'],
            moving: ['moving', 'Moving'],
            aiming: ['aiming', 'Aiming'],
            light: ['light', 'Adjusting the light'],
            furniture: ['furniture', 'Furniture'],
            room: ['room', 'The room'],
            views: ['views', 'The view'],
            units: ['concepts/units', 'Light and its units'],
            polar: ['concepts/polar-charts', 'IES files and polar charts'],
            laws: ['concepts/distance-and-angle', 'Distance and angle'],
            workPlane: ['concepts/work-plane', 'The work plane'],
            uniformity: ['concepts/uniformity', 'Uniformity'],
            maintenance: ['concepts/maintenance', 'Maintenance factor'],
            levels: ['concepts/recommended-levels', 'Recommended levels'],
            howItCalculates: ['concepts/how-it-calculates', 'How Lux Studio calculates'],
            standing: ['analysis/', 'Where we stand'],
            features: ['analysis/feature-by-feature', 'Feature by feature'],
            speed: ['analysis/speed', 'Speed'],
            method: ['analysis/method', 'How we compare'],
            files: ['saving', 'Saving, opening and sharing'],
            ies: ['ies-files', 'Your IES files'],
            screenshots: ['screenshots', 'Screenshots'],
            touch: ['phones-and-tablets', 'Phones and tablets'],
            shortcuts: ['shortcuts', 'Keyboard shortcuts'],
            help: ['troubleshooting', 'When something is off'],
          },
        }),
      },
    },
  },

  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
              modal: {
                noResultsText: 'Sin resultados para',
                resetButtonTitle: 'Borrar la búsqueda',
                footer: { selectText: 'elegir', navigateText: 'moverse', closeText: 'cerrar' },
              },
            },
          },
        },
      },
    },
  },
});
