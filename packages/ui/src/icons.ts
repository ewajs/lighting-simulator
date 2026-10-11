import { html, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { IconNode } from 'lucide';
import { LampCeiling, LampDesk, LampFloor, LampWallDown, Lightbulb, Spotlight } from 'lucide';
import type { MountType } from '@luxstudio/core';

const markup = new WeakMap<IconNode, string>();

/**
 * Renders a Lucide icon (ADR 0023) inheriting the text colour. Icon data comes
 * from the lucide package, so building SVG markup from it is safe.
 */
export function icon(node: IconNode): TemplateResult {
  let inner = markup.get(node);
  if (inner === undefined) {
    inner = node
      .map(([tag, attrs]) => {
        const attributes = Object.entries(attrs)
          .filter(([, value]) => value !== undefined)
          .map(([name, value]) => `${name}="${String(value)}"`)
          .join(' ');
        return `<${tag} ${attributes}/>`;
      })
      .join('');
    markup.set(node, inner);
  }
  return html`<svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    ${unsafeSVG(inner)}
  </svg>`;
}

const MOUNT_ICONS: Record<MountType, IconNode> = {
  recessed: Lightbulb,
  pendant: LampCeiling,
  track: Spotlight,
  wall: LampWallDown,
  floor: LampFloor,
  table: LampDesk,
};

/** Icon for a product's mount type, used when there is no thumbnail. */
export const mountIcon = (mount: MountType | undefined): TemplateResult =>
  icon(mount ? MOUNT_ICONS[mount] : Lightbulb);
