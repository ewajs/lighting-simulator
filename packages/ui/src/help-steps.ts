// What the help carousel says, one step per card (ADR 0046). Kept short:
// a title and a sentence or two, with wording for touch screens where the
// gestures differ.

import { msg } from '@lit/localize';
import type { IllustrationName } from './help-illustrations';

/** One card of the help carousel. */
export interface HelpStep {
  readonly illustration: IllustrationName;
  readonly title: string;
  readonly body: string;
}

/** What decides which steps show and how they're worded. */
export interface HelpContext {
  /** A touch screen: "tap" and "one finger" instead of "click" and "drag". */
  readonly touch: boolean;
  /** The host lets users load their own IES files (ADR 0037). */
  readonly iesImport: boolean;
}

/** The steps to show, in order, in the active language. */
export function helpSteps({ touch, iesImport }: HelpContext): HelpStep[] {
  const steps: HelpStep[] = [
    {
      illustration: 'welcome',
      title: msg('Welcome to Lux Studio'),
      body: msg(
        'Lay out a room with luminaires and furniture, and see how each product lights it, with its real light.',
      ),
    },
    {
      illustration: 'add',
      title: msg('Add luminaires and furniture'),
      body: touch
        ? msg(
            'Tap a product in the catalog and it appears in the room. The switch at the top shows furniture.',
          )
        : msg(
            'Click a product in the catalog, or drag it into the room. The switch at the top shows furniture.',
          ),
    },
    {
      illustration: 'move',
      title: msg('Pick, move and turn'),
      body: touch
        ? msg(
            'Tap something to pick it, and drag it with one finger. The arrows move it in one direction; the ring on the floor turns furniture.',
          )
        : msg(
            'Click something to pick it, and drag it. The arrows (W) move it in one direction; the ring on the floor turns furniture.',
          ),
    },
    {
      illustration: 'aim',
      title: msg('Aim the light'),
      body: touch
        ? msg('With Aim, drag the dot to where you want the light, or turn the ring.')
        : msg('With Aim (E), drag the dot to where you want the light, or turn the ring.'),
    },
    {
      illustration: 'light',
      title: msg('Adjust the light'),
      body: msg('In Properties: dimming, colour temperature, and on or off.'),
    },
    {
      illustration: 'room',
      title: msg('The room'),
      body: msg(
        'With nothing picked, Properties shows the room: its size, and a colour or a material for the floor, walls and ceiling.',
      ),
    },
    {
      illustration: 'view',
      title: msg('Look around'),
      body: touch
        ? msg('One finger on empty space orbits, two fingers pan, and a pinch zooms.')
        : msg(
            'Drag on empty space to orbit and use the wheel to zoom. Plan, Front and Side are ready-made views.',
          ),
    },
    {
      illustration: 'analysis',
      title: msg('See the light in numbers'),
      body: touch
        ? msg(
            'Analysis gives the lux on the work plane and each surface. The Illuminance view, under View, paints them in colour; tap a surface to read its lux.',
          )
        : msg(
            'Analysis, in the left panel, gives the lux on the work plane and each surface. Press 3 to paint them in colour, and point anywhere to read its lux.',
          ),
    },
    {
      illustration: 'precision',
      title: msg('Precise, and undoable'),
      body: touch
        ? msg('The magnet snaps to 10 cm and lines things up. Undo is at the top.')
        : msg('The magnet snaps to 10 cm and lines things up; hold Alt to move freely. ⌘Z undoes.'),
    },
    {
      illustration: 'files',
      title: msg('Save, share, start over'),
      body: touch
        ? msg(
            'Your work saves itself in this browser. In the ⋯ menu, New starts from a template, Save and Open use files, and Share sends a link.',
          )
        : msg(
            'Your work saves itself in this browser. At the top, New starts from a template, Save and Open use files, and Share makes a link.',
          ),
    },
  ];
  if (iesImport) {
    steps.push({
      illustration: 'ies',
      title: msg('Try your own IES file'),
      body: msg('At the bottom of the catalog, load a luminaire’s IES file to see its light.'),
    });
  }
  return steps;
}
