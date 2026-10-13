import { describe, expect, it } from 'vitest';
import { helpSeen, markHelpSeen } from './help-seen';
import { helpSteps } from './help-steps';

describe('helpSteps', () => {
  it('has seven steps, plus one about IES files when import is on', () => {
    expect(helpSteps({ touch: false, iesImport: false })).toHaveLength(7);
    const withIes = helpSteps({ touch: false, iesImport: true });
    expect(withIes).toHaveLength(8);
    expect(withIes.at(-1)?.illustration).toBe('ies');
  });

  it('words the gestures for touch screens', () => {
    const [, mouseAdd] = helpSteps({ touch: false, iesImport: false });
    const [, touchAdd] = helpSteps({ touch: true, iesImport: false });
    expect(mouseAdd?.body).toMatch(/^Click/);
    expect(touchAdd?.body).toMatch(/^Tap/);
  });

  it('keeps the same cards in the same order either way', () => {
    const names = (touch: boolean) =>
      helpSteps({ touch, iesImport: true }).map((step) => step.illustration);
    expect(names(true)).toEqual(names(false));
  });
});

describe('helpSeen', () => {
  it('treats missing storage as not seen, and never throws', () => {
    // Node has no localStorage, like a browser that blocks it.
    expect(helpSeen()).toBe(false);
    expect(() => markHelpSeen()).not.toThrow();
  });
});
