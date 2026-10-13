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
        'Lay out a room, place luminaires and see how they light it, with their real light.',
      ),
    },
    {
      illustration: 'add',
      title: msg('Add luminaires'),
      body: touch
        ? msg('Tap a product in the catalog and it appears in the room.')
        : msg('Click a product in the catalog, or drag it into the room.'),
    },
    {
      illustration: 'move',
      title: msg('Pick and move'),
      body: touch
        ? msg(
            'Tap a luminaire to pick it, and drag it with one finger. The arrows move it in one direction.',
          )
        : msg(
            'Click a luminaire to pick it, and drag it. The arrows (W) move it in one direction.',
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
      illustration: 'view',
      title: msg('Look around'),
      body: touch
        ? msg('One finger on empty space orbits, two fingers pan, and a pinch zooms.')
        : msg(
            'Drag on empty space to orbit and use the wheel to zoom. Plan, Front and Side are ready-made views.',
          ),
    },
    {
      illustration: 'precision',
      title: msg('Precise, and undoable'),
      body: touch
        ? msg('The magnet snaps to 10 cm and lines things up. Undo is at the top.')
        : msg('The magnet snaps to 10 cm and lines things up; hold Alt to move freely. ⌘Z undoes.'),
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
