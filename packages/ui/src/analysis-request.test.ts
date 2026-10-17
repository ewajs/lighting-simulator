import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
  type Product,
} from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { AnalysisService, type AnalysisRequest } from './analysis-request';

const product: Product = {
  id: 'lamp',
  mount: 'recessed',
  power: 10,
  flux: 1000,
  cct: 3000,
  beamDeg: 60,
};
const request = (id: number, dimming = 1): AnalysisRequest => ({
  type: 'analyse',
  id,
  scene: {
    room: DEFAULT_ROOM,
    luminaires: [
      {
        id: 'l',
        productId: 'lamp',
        position: { x: 0, y: DEFAULT_ROOM.height, z: 0 },
        aim: { tiltDeg: 0, panDeg: 0 },
        dimming,
        on: true,
        cct: 3000,
      },
    ],
    furniture: [],
  },
  snapshot: { products: [product], photometry: {}, modelFiles: {} },
  settings: DEFAULT_ANALYSIS_SETTINGS,
  options: DEFAULT_CALCULATION_OPTIONS,
});
const floor = {
  type: 'probe' as const,
  id: 1,
  point: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
};

describe('AnalysisService', () => {
  it('answers with the analysis and how long it took', () => {
    let t = 0;
    const response = new AnalysisService().analyse(request(7), () => (t += 5));
    expect(response.id).toBe(7);
    expect('analysis' in response && response.analysis.surfaces).toHaveLength(7);
    expect('ms' in response && response.ms).toBe(5);
  });

  it('reuses the room from the request before', () => {
    const service = new AnalysisService();
    const first = service.analyse(request(1), () => 0);
    const second = service.analyse(request(2, 0.5), () => 0);
    expect('roomReused' in first && first.roomReused).toBe(false);
    expect('roomReused' in second && second.roomReused).toBe(true);
  });

  it('answers with the reason when the calculation refuses the settings', () => {
    const response = new AnalysisService().analyse(
      { ...request(7), settings: { ...DEFAULT_ANALYSIS_SETTINGS, maintenanceFactor: 2 } },
      () => 0,
    );
    expect(response.id).toBe(7);
    expect('error' in response && response.error).toMatch(/maintenance factor/);
  });

  it('reads the light at a point from the last calculation, as the analysis does', () => {
    const service = new AnalysisService();
    expect(service.probe(floor).illuminance).toBeUndefined();
    service.analyse(request(1), () => 0);
    const bright = service.probe(floor).illuminance!;
    expect(bright.totalLx).toBeCloseTo(bright.directLx + bright.indirectLx, 9);
    expect(bright.directLx).toBeGreaterThan(0);
    // Half the light, half the lux: the probe follows the latest calculation.
    service.analyse(request(2, 0.5), () => 0);
    expect(service.probe(floor).illuminance!.totalLx / bright.totalLx).toBeCloseTo(0.5, 9);
  });
});
