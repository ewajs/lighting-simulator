import { describe, expect, it } from 'vitest';
import { VERSION } from './index';

// Pipeline smoke test: proves Vitest runs TypeScript in this package.
describe('package entry', () => {
  it('exports a semver version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
