import {
  AnalysisCache,
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
} from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { runAnalysis } from './analysis-request';

describe('runAnalysis', () => {
  const base = {
    id: 7,
    scene: { room: DEFAULT_ROOM, luminaires: [], furniture: [] },
    snapshot: { products: [], photometry: {}, modelFiles: {} },
    settings: DEFAULT_ANALYSIS_SETTINGS,
    options: DEFAULT_CALCULATION_OPTIONS,
  };

  it('answers with the analysis and how long it took', () => {
    let t = 0;
    const response = runAnalysis(base, () => (t += 5));
    expect(response.id).toBe(7);
    expect('analysis' in response && response.analysis.surfaces).toHaveLength(7);
    expect('ms' in response && response.ms).toBe(5);
  });

  it('reuses the room from the request before, with a cache', () => {
    const cache = new AnalysisCache();
    const first = runAnalysis(base, () => 0, cache);
    const second = runAnalysis({ ...base, id: 8 }, () => 0, cache);
    expect('roomReused' in first && first.roomReused).toBe(false);
    expect('roomReused' in second && second.roomReused).toBe(true);
  });

  it('answers with the reason when the calculation refuses the settings', () => {
    const response = runAnalysis(
      { ...base, settings: { ...DEFAULT_ANALYSIS_SETTINGS, maintenanceFactor: 2 } },
      () => 0,
    );
    expect(response.id).toBe(7);
    expect('error' in response && response.error).toMatch(/maintenance factor/);
  });
});
