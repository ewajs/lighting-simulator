// The Analysis pages' names for rooms, surfaces and the calculation's feature
// steps, in both languages (ADR 0062). The data keeps stable ids; pages show these.

/** The manual's two languages: Spanish (Argentina), the default, and English. */
export type Lang = 'es' | 'en';

/** A page's language from VitePress's `lang` (`es-AR` or `en`). */
export function langOf(lang: string): Lang {
  return lang.startsWith('en') ? 'en' : 'es';
}

/** Each reference room's name and a one-line description. */
export const ROOMS: Record<string, Record<Lang, { name: string; about: string }>> = {
  'single-downlight': {
    es: {
      name: 'Una downlight',
      about:
        'Una downlight empotrada de 6 pulgadas (Cooper, 1153 lm) en el medio de un ambiente de 5 × 4 × 2,7 m, apuntando hacia abajo: el caso básico.',
    },
    en: {
      name: 'One downlight',
      about:
        'One 6-inch recessed downlight (Cooper, 1153 lm) in the middle of a 5 × 4 × 2.7 m room, aimed straight down: the basic case.',
    },
  },
  'downlights-and-wall-washer': {
    es: {
      name: 'Cuatro downlights y un bañador de pared',
      about:
        'Cuatro downlights en cuadrícula y un bañador de pared asimétrico (Lightolier) a 0,5 m de la pared izquierda, con el haz girado hacia ella: varias luminarias a la vez y una distribución asimétrica.',
    },
    en: {
      name: 'Four downlights and a wall washer',
      about:
        'Four downlights on a grid and an asymmetric wall washer (Lightolier) 0.5 m from the left wall, its beam turned onto it: several lights at once, and an asymmetric distribution.',
    },
  },
  'track-spots': {
    es: {
      name: 'Dos spots de riel inclinados',
      about:
        'Dos spots angostos (iGuzzini Palco, haz de 17°, 2913 lm) colgados a 2,5 m, inclinados y girados: uno al piso, hacia la pared del fondo, y otro a la pared izquierda.',
    },
    en: {
      name: 'Two tilted track spots',
      about:
        'Two narrow track spots (iGuzzini Palco, 17° beam, 2913 lm) hung at 2.5 m, tilted and panned: one onto the floor towards the back wall, one onto the left wall.',
    },
  },
  'linear-pendant-over-table': {
    es: {
      name: 'Un colgante lineal sobre una mesa',
      about:
        'Un colgante lineal de 1,2 m con luz hacia arriba y hacia abajo (Finelite HP-2) a 1,55 m sobre una mesa de roble de 1,6 × 0,9 m: cerca de una luminaria grande, con sombra en el piso y luz en el techo.',
    },
    en: {
      name: 'A linear pendant over a table',
      about:
        'A 1.2 m up/down linear pendant (Finelite HP-2) 1.55 m over a 1.6 × 0.9 m oak table top: close to a large luminaire, with a shadow on the floor and light on the ceiling.',
    },
  },
  'wall-sconce': {
    es: {
      name: 'Un aplique de pared',
      about:
        'Un aplique con luz hacia arriba y hacia abajo (Visa Colonnade, una caja que brilla de 23 × 13 × 51 cm) en la pared izquierda, a 1,8 m de altura y centrado a 25 cm de ella: muy cerca de la pared que tiene detrás.',
    },
    en: {
      name: 'A wall sconce',
      about:
        'An up/down wall sconce (Visa Colonnade, a 23 × 13 × 51 cm glowing box) on the left wall, 1.8 m up and centred 25 cm out from it: very close to the wall behind it.',
    },
  },
  'furnished-living': {
    es: {
      name: 'Un living amueblado',
      about:
        'Un living con cuatro downlights sobre un sillón, una mesa ratona, una mesa de comedor y una biblioteca, que tapan y reflejan la luz según su terminación (lino 0,55; roble 0,45).',
    },
    en: {
      name: 'A furnished living room',
      about:
        'A living room with four downlights over a sofa, a coffee table, a dining table and a bookcase, which block and reflect light as their finishes do (linen 0.55, oak 0.45).',
    },
  },
  'busy-open-plan': {
    es: {
      name: 'Un ambiente integrado con diez muebles',
      about:
        'Un ambiente de 6 × 5 m con living (sillón, dos sillones individuales, mesa ratona y mueble de TV), dos bibliotecas, una mesa de comedor bajo un colgante lineal, una isla de cocina y un escritorio. Nueve luminarias: siete downlights, el colgante y un bañador de pared. Terminaciones del nogal (0,15) al blanco (0,8).',
    },
    en: {
      name: 'A busy open-plan room',
      about:
        'A 6 × 5 m room with a living area (sofa, two armchairs, coffee table and TV unit), two bookcases, a dining table under a linear pendant, a kitchen island and a desk. Nine luminaires: seven downlights, the pendant and a wall washer. Finishes from walnut (0.15) to white (0.8).',
    },
  },
};

/** The order rooms are listed in: simplest first. */
export const ROOM_ORDER = [
  'single-downlight',
  'downlights-and-wall-washer',
  'track-spots',
  'linear-pendant-over-table',
  'wall-sconce',
  'furnished-living',
  'busy-open-plan',
] as const;

/** The measured surfaces. Seen from above, x runs left to right and z from the back to the front. */
export const SURFACES: Record<string, Record<Lang, string>> = {
  'work-plane': { es: 'Plano de trabajo', en: 'Work plane' },
  floor: { es: 'Piso', en: 'Floor' },
  ceiling: { es: 'Techo', en: 'Ceiling' },
  'wall-x-': { es: 'Pared izquierda', en: 'Left wall' },
  'wall-x+': { es: 'Pared derecha', en: 'Right wall' },
  'wall-z-': { es: 'Pared del fondo', en: 'Back wall' },
  'wall-z+': { es: 'Pared del frente', en: 'Front wall' },
};

/** The calculation's feature steps (ADR 0061), each adding one feature to the one before. */
export const STEPS: Record<string, Record<Lang, { name: string; short: string }>> = {
  'point-sources': {
    es: { name: 'Luminarias como puntos, solo luz directa', short: 'Solo directa' },
    en: { name: 'Luminaires as points, direct light only', short: 'Direct only' },
  },
  'bounced-light': {
    es: { name: '+ la luz que rebota', short: '+ rebotes' },
    en: { name: '+ light that bounces', short: '+ bounces' },
  },
  'split-openings': {
    es: { name: '+ aberturas divididas en celdas', short: '+ celdas' },
    en: { name: '+ openings split into cells', short: '+ cells' },
  },
  'furniture-shadows': {
    es: { name: '+ sombras de los muebles', short: '+ sombras' },
    en: { name: '+ furniture shadows', short: '+ shadows' },
  },
  'furniture-hides-bounce': {
    es: { name: '+ los muebles tapan la luz que rebota (negros)', short: '+ tapan' },
    en: { name: '+ furniture hides bounced light (black)', short: '+ hides' },
  },
  'furniture-in-bounce': {
    es: { name: '+ los muebles también la reflejan', short: '+ reflejan' },
    en: { name: '+ furniture reflects it too', short: '+ reflects' },
  },
};

/** A name from one of the tables above, or the id itself if it's missing. */
export function nameOf<T>(
  table: Record<string, Record<Lang, T>>,
  id: string,
  lang: Lang,
): T | string {
  return table[id]?.[lang] ?? id;
}

/** The three ways the pages measure a difference with Radiance (ADR 0058, 0061). */
export const METRICS: Record<string, Record<Lang, { name: string; about: string }>> = {
  meanPointError: {
    es: {
      name: 'Diferencia media por punto',
      about:
        'El promedio de la diferencia en cada punto iluminado (al menos el 10 % del más iluminado).',
    },
    en: {
      name: 'Mean difference per point',
      about:
        "The average difference at each lit point (at least 10 % of the brightest one's light).",
    },
  },
  worstAverage: {
    es: {
      name: 'Peor promedio de una superficie',
      about:
        'La mayor diferencia entre los promedios de cada superficie: lo que muestra un informe.',
    },
    en: {
      name: 'Worst surface average',
      about: "The largest difference among each surface's average: what a report shows.",
    },
  },
  worstFar: {
    es: {
      name: 'Peor punto a más de 1 m',
      about: 'La mayor diferencia en un punto iluminado a más de 1 m de toda luminaria.',
    },
    en: {
      name: 'Worst point over 1 m away',
      about: 'The largest difference at a lit point more than 1 m from every luminaire.',
    },
  },
};

/** Words the charts use, by language. */
export const WORDS: Record<Lang, Record<string, string>> = {
  es: {
    difference: 'Diferencia con Radiance',
    ours: 'Lux Studio',
    radiance: 'Radiance',
    direct: 'Luz directa',
    total: 'Luz total (directa + rebotes)',
    time: 'Tiempo',
    measure: 'Medida',
    room: 'Ambiente',
    step: 'Paso',
    furnished: 'Con muebles',
    empty: 'Sin muebles',
    surface: 'Superficie',
    light: 'Luz',
    noiseLine: 'La línea punteada marca el 0,3 %: el ruido de Radiance en un punto.',
    oursDirect: 'Lux Studio, solo luz directa',
    oursFull: 'Lux Studio, cálculo completo',
    radianceDirect: 'Radiance, luz directa',
    radianceFull: 'Radiance, con rebotes',
    seconds: 'Segundos, escala logarítmica',
    perStep: 'Milisegundos por ambiente',
    planLuminaire: 'Luminaria (la flecha: hacia dónde apunta)',
    planFurniture: 'Mueble',
    planMeasured: 'Superficie medida',
    planWorkPlane: 'Plano de trabajo medido',
    lux: 'Iluminancia (lx)',
    differenceMap: 'Diferencia: Lux Studio / Radiance − 1',
    averageDifference: 'diferencia del promedio',
    compare: 'Comparar',
    totalEmpty: 'Total, sin muebles',
    totalShort: 'Total',
    directShort: 'Directa',
    tooDark: 'Lux Studio da menos',
    tooBright: 'Lux Studio da más',
    scatterX: 'Radiance (lx)',
    scatterY: 'Lux Studio (lx)',
    scatterBand: 'Las líneas punteadas marcan ±10 %; cada punto es uno de la cuadrícula.',
    average: 'Promedio',
    worstFarShort: 'Peor punto a más de 1 m',
    worstNearShort: 'Peor punto a menos de 1 m',
    tableDifference: 'Diferencia',
    tableFar: 'Peor > 1 m',
    tableNear: 'Peor < 1 m',
    tableNote:
      'Ē es el promedio de la superficie. "Peor" es la mayor diferencia en un punto iluminado (al menos el 10 % del más iluminado), a más o a menos de 1 m de una luminaria. Verde: dentro del 1 %; ámbar: dentro del 5 %; rosa: más.',
    stepError: 'Diferencia media por punto',
    stepTime: 'Tiempo de cálculo (ms)',
    emptyLegend: 'Sin muebles, en los dos programas',
    asIs: 'El ambiente tal como es',
  },
  en: {
    difference: 'Difference with Radiance',
    ours: 'Lux Studio',
    radiance: 'Radiance',
    direct: 'Direct light',
    total: 'Total light (direct + bounces)',
    time: 'Time',
    measure: 'Measure',
    room: 'Room',
    step: 'Step',
    furnished: 'Furnished',
    empty: 'Without furniture',
    surface: 'Surface',
    light: 'Light',
    noiseLine: "The dashed line marks 0.3 %: Radiance's own noise at a point.",
    oursDirect: 'Lux Studio, direct light only',
    oursFull: 'Lux Studio, full calculation',
    radianceDirect: 'Radiance, direct light',
    radianceFull: 'Radiance, with bounces',
    seconds: 'Seconds, log scale',
    perStep: 'Milliseconds per room',
    planLuminaire: 'Luminaire (the arrow: where it points)',
    planFurniture: 'Furniture',
    planMeasured: 'Measured surface',
    planWorkPlane: 'Measured work plane',
    lux: 'Illuminance (lx)',
    differenceMap: 'Difference: Lux Studio / Radiance − 1',
    averageDifference: 'difference in the average',
    compare: 'Compare',
    totalEmpty: 'Total, without furniture',
    totalShort: 'Total',
    directShort: 'Direct',
    tooDark: 'Lux Studio gives less',
    tooBright: 'Lux Studio gives more',
    scatterX: 'Radiance (lx)',
    scatterY: 'Lux Studio (lx)',
    scatterBand: 'The dashed lines mark ±10 %; each dot is one point of the grid.',
    average: 'Average',
    worstFarShort: 'Worst point over 1 m away',
    worstNearShort: 'Worst point within 1 m',
    tableDifference: 'Difference',
    tableFar: 'Worst > 1 m',
    tableNear: 'Worst < 1 m',
    tableNote:
      'Ē is the surface\'s average. "Worst" is the largest difference at a lit point (at least 10 % of the brightest one\'s light), more or less than 1 m from a luminaire. Green: within 1 %; amber: within 5 %; rose: beyond.',
    stepError: 'Mean difference per point',
    stepTime: 'Calculation time (ms)',
    emptyLegend: 'Without furniture, in both programs',
    asIs: 'The room as it is',
  },
};

/** What to look for in each room, by language. */
export const ROOM_NOTES: Record<string, Record<Lang, string>> = {
  'single-downlight': {
    es: 'El caso más simple: una luminaria chica, lejos de todo. Prueba las leyes de la luz directa y los rebotes sin nada que las complique; acá las diferencias tienen el tamaño del ruido de Radiance.',
    en: "The simplest case: one small luminaire, far from everything. It tests the laws of direct light and bounces with nothing to complicate them; here the differences are the size of Radiance's own noise.",
  },
  'downlights-and-wall-washer': {
    es: 'Varias luminarias que suman su luz, y un bañador que reparte la suya de forma asimétrica sobre la pared izquierda. Las diferencias más grandes están en esa pared, cerca del bañador.',
    en: 'Several luminaires adding up their light, and a wall washer spreading its own unevenly over the left wall. The largest differences are on that wall, near the washer.',
  },
  'track-spots': {
    es: 'Dos haces angostos e inclinados: prueban que la inclinación y el giro llevan la luz adonde tienen que llevarla. Un error de pocos grados movería el círculo de luz, y se vería enseguida en el mapa de diferencias.',
    en: 'Two narrow, tilted beams: they test that tilt and pan put the light where it belongs. A few degrees off would move the pool of light, and the difference map would show it at once.',
  },
  'linear-pendant-over-table': {
    es: 'Cerca de una luminaria grande, y con un mueble que refleja. Dividir la abertura en celdas corrige los puntos cercanos. La mesa refleja luz hacia el techo y le hace sombra al piso de abajo también en la luz que rebota: sin contarlo, el techo daba un 7 % menos.',
    en: 'Close to a large luminaire, with a piece of furniture that reflects. Splitting the opening into cells fixes the points close to it. The table reflects light to the ceiling and shades the floor below from bounced light too: without counting that, the ceiling read 7 % low.',
  },
  'wall-sconce': {
    es: 'Una caja que brilla, centrada a 25 cm de la pared. Muy cerca, los dos programas aproximan de forma distinta una abertura grande. Toda la habitación da algo más que en Radiance, probablemente porque allá el cuerpo del aplique tapa parte de la luz que rebota en la pared de atrás; en Lux Studio, las luminarias no tapan luz.',
    en: "A glowing box centred 25 cm from its wall. Very close, the two programs approximate a large opening differently. The whole room reads a little higher than in Radiance, probably because there the sconce's body hides some of the light bouncing off the wall behind it; in Lux Studio, luminaires don't hide light.",
  },
  'furnished-living': {
    es: 'Cuatro muebles que tapan y reflejan la luz, también la que rebota. Probalo con Paso en los mapas: si los muebles solo tapan la luz que rebota, como cajas negras, todo da menos que en Radiance; cuando además la reflejan, como su terminación, coincide. Algunos puntos del plano de trabajo caen dentro de la biblioteca, donde los dos programas dan casi 0.',
    en: 'Four pieces of furniture that block and reflect light, bounced light included. Try it with Step on the maps: if the furniture only hides bounced light, like black boxes, everything reads lower than in Radiance; when it reflects it too, as its finish does, they agree. A few work-plane points fall inside the bookcase, where both programs give almost 0.',
  },
  'busy-open-plan': {
    es: 'Diez muebles, nueve luminarias y un ambiente más grande, para ver cómo crecen la diferencia y el tiempo. Los promedios siguen dentro del 1 % de Radiance. Los peores puntos están en el piso, entre muebles: entre el sillón y la mesa ratona, o detrás de la isla, una downlight se ve apenas por encima de un borde. Radiance ve una parte de su abertura de 15 cm; en Lux Studio, cada celda de 7,6 cm se ve o no, y el punto da 0 o el doble. Son pocos: menos del 3 % de los puntos iluminados se alejan más del 10 %. Junto al costado de la isla, a 2,5 cm de ella y 10 cm debajo de su tapa, el plano de trabajo da hasta un 12 % menos, todo en la luz que rebota. Con parches de la mitad de tamaño baja apenas al 10 %, así que no es el tamaño del parche; la causa todavía no está clara.',
    en: "Ten pieces of furniture, nine luminaires and a larger room, to see how the difference and the time grow. Averages stay within 1 % of Radiance. The worst points are on the floor between furniture: between the sofa and the coffee table, or behind the island, a downlight shows only just past an edge. Radiance sees part of its 15 cm opening; in Lux Studio each 7.6 cm cell is seen or not, so the point reads 0 or double. They're few: under 3 % of the lit points are off by more than 10 %. Beside the island, 2.5 cm from its side and 10 cm below its top, the work plane reads up to 12 % low, all of it in bounced light. Patches half the size only bring it to 10 %, so it isn't the patch size; the cause isn't clear yet.",
  },
};
