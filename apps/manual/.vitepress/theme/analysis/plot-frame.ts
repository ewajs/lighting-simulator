// Draws an Observable Plot chart into an element, in the browser only, and
// redraws it when the theme, the element's width or the chart's inputs change
// (ADR 0062). Colours come from the theme's tokens, read when drawing: Plot
// writes them into SVG attributes, which can't use CSS variables.
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import { useData } from 'vitepress';

/** The theme's chart colours, as values Plot can use. */
export interface Palette {
  /** The data series, in order: Lux Studio's amber first, then blue, teal, rose, violet. */
  readonly series: readonly string[];
  readonly neutral: string;
  readonly grid: string;
  readonly text: string;
  readonly muted: string;
  readonly background: string;
}

/** Lux Studio's colour in charts, and the reference's. */
export const OURS = 0;
export const RADIANCE = 1;

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    series: ['--lx-c-1', '--lx-c-2', '--lx-c-3', '--lx-c-4', '--lx-c-5'].map(token),
    neutral: token('--lx-c-neutral'),
    grid: token('--lx-grid'),
    text: token('--vp-c-text-1'),
    muted: token('--vp-c-text-2'),
    background: token('--vp-c-bg'),
  };
}

/**
 * Keeps `container` showing `draw`'s chart.
 *
 * @param draw Makes the chart for a width in px and the current palette.
 * @param inputs What the chart depends on besides width and theme: reactive state it reads.
 */
export function usePlot(
  container: Ref<HTMLElement | null>,
  draw: (width: number, palette: Palette) => Element,
  inputs: () => unknown = () => undefined,
): void {
  const { isDark } = useData();
  let observer: ResizeObserver | undefined;
  let width = 0;
  const render = () => {
    const element = container.value;
    if (!element || width === 0) return;
    element.replaceChildren(draw(width, readPalette()));
  };
  onMounted(() => {
    const element = container.value;
    if (!element) return;
    observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry!.contentRect.width);
      if (next !== width) {
        width = next;
        render();
      }
    });
    observer.observe(element);
  });
  onBeforeUnmount(() => observer?.disconnect());
  // The theme's class changes before isDark does, so the new colours are there to read.
  watch([isDark, inputs], render, { flush: 'post' });
}

/** A share as a percentage for labels: 0.0123 → "1,2 %" in Spanish, "1.2 %" in English. */
export function percent(value: number, lang: string, digits = 1): string {
  return `${(value * 100).toLocaleString(lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}
