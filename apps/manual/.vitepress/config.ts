import { defineConfig, type DefaultTheme } from 'vitepress';

const DEMO_URL = 'https://ewajs.github.io/lighting-simulator/';

/** The sidebar, in each language. Slugs differ by language; the structure doesn't. */
function sidebar(
  prefix: string,
  t: {
    start: string;
    use: string;
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
    { text: t.more, items: ['ies', 'screenshots', 'touch', 'shortcuts', 'help'].map(item) },
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

  locales: {
    root: {
      label: 'Español',
      lang: 'es-AR',
      description: 'Manual de Lux Studio: cómo armar un ambiente y ver la luz.',
      themeConfig: {
        nav: [{ text: 'Abrir Lux Studio', link: DEMO_URL }],
        sidebar: sidebar('/', {
          start: 'Empezar',
          use: 'Usar Lux Studio',
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
          start: 'Start',
          use: 'Using Lux Studio',
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
