import { consoleLogger, Simulator, type Catalog, type PhotometryProvider } from '@luxstudio/core';
import { loadAutosave, type Locale } from '@luxstudio/ui';
import '@luxstudio/ui/theme.css';
import { ImportedProducts } from './imported-products';
import { sampleCatalog } from './sample-catalog';
import { sampleDisplay } from './sample-display';
import { sampleModels } from './sample-models';
import { samplePhotometry } from './sample-photometry';
import { localizedTemplates, sampleTemplates } from './sample-templates';
import { sampleTextures } from './sample-textures';

// Visitors can try their own IES files; they join the sample catalog for this visit.
const imported = new ImportedProducts();
const catalog: Catalog = { get: (id) => sampleCatalog.get(id) ?? imported.get(id) };
const photometry: PhotometryProvider = {
  load: (id) => {
    const text = imported.text(id);
    return text === undefined ? samplePhotometry.load(id) : Promise.resolve(text);
  },
};

// `?debug` in the URL logs every step to the console and shows frame rate and draw counts.
const debug = new URLSearchParams(location.search).has('debug');

// Built once, so their ids stay put; the dining room is also the starter scene.
const templates = sampleTemplates(catalog);

// Where the visitor left off (autosaved in this browser), else the starter
// scene. Either is the starting scene, not edits: undo can't take it apart.
const simulator = new Simulator({
  catalog,
  scene: loadAutosave() ?? templates[0]!.scene,
  photometry,
  models: sampleModels,
  textures: sampleTextures,
  logger: consoleLogger(debug ? 'debug' : 'warn'),
});

const app = document.createElement('lxs-app');
app.simulator = simulator;
app.iesImport = true;
app.diagnostics = debug;
app.autosave = true;
// First-time visitors get the getting-started help; it links to the manual,
// which is published next to the demo.
app.helpOnStart = true;
app.manualUrls = {
  'es-AR': new URL('manual/', document.baseURI).href,
  en: new URL('manual/en/', document.baseURI).href,
};
/** Names, materials and templates in the given language, with the visitor's imported files. */
const display = (locale: Locale) => ({
  ...sampleDisplay(locale, imported.items),
  templates: localizedTemplates(templates, locale),
});
app.catalog = display('es-AR'); // Matches the default UI locale.
// Product names come from the host, so swap them when the user changes language.
app.addEventListener('lxs-locale-change', ({ detail }) => (app.catalog = display(detail.locale)));
app.addEventListener('lxs-import-ies', ({ detail }) => {
  imported.add(detail);
  app.catalog = display(app.locale);
});

const brand = document.createElement('span');
brand.slot = 'brand';
brand.textContent = 'Lux Studio';
app.append(brand);
document.body.append(app);
