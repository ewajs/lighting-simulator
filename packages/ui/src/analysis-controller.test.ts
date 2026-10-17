import { Simulator, type Catalog, type Product } from '@luxstudio/core';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisController } from './analysis-controller';
import type { AnalysisRequest, AnalysisResponse } from './analysis-request';
import { THROTTLE_MS, type WorkerLike } from './analysis-runner';

/** A worker that keeps what it's sent and answers when told to. */
class FakeWorker implements WorkerLike {
  sent: AnalysisRequest[] = [];
  #onMessage: ((event: MessageEvent<AnalysisResponse>) => void) | undefined;
  postMessage(message: AnalysisRequest): void {
    this.sent.push(message);
  }
  addEventListener(type: 'message' | 'error', listener: never): void {
    if (type === 'message') this.#onMessage = listener;
  }
  terminate(): void {}
  /** Answers the last request, as if it were calculated in `ms`. */
  answerLast(ms = 10): void {
    const last = this.sent[this.sent.length - 1]!;
    // Only what the controller reads of an analysis.
    const analysis = { indirect: { patches: 0, iterations: 0 } } as never;
    const event = {
      data: { id: last.id, analysis, ms },
    } as unknown as MessageEvent<AnalysisResponse>;
    this.#onMessage!(event);
  }
}

/** Just enough of a Lit element to hold a controller. */
class Host implements ReactiveControllerHost {
  updates = 0;
  controllers: ReactiveController[] = [];
  addController(controller: ReactiveController): void {
    this.controllers.push(controller);
  }
  removeController(): void {}
  requestUpdate(): void {
    this.updates++;
  }
  readonly updateComplete = Promise.resolve(true);
}

const product: Product = {
  id: 'lamp',
  mount: 'recessed',
  power: 10,
  flux: 1000,
  cct: 3000,
  beamDeg: 60,
};
const catalog: Catalog = { get: (id) => (id === 'lamp' ? product : undefined) };

function setUp() {
  const worker = new FakeWorker();
  const host = new Host();
  const controller = new AnalysisController(host, () => worker);
  const simulator = new Simulator({ catalog });
  simulator.addLuminaire('lamp');
  controller.setSimulator(simulator);
  return { worker, host, controller, simulator };
}

describe('AnalysisController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calculates nothing while its results are off screen', () => {
    const { worker, controller, simulator } = setUp();
    simulator.updateLuminaire(simulator.scene.luminaires[0]!.id, { dimming: 0.5 });
    controller.changed();
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(worker.sent).toHaveLength(0);
    expect(controller.state.stale).toBe(true);
  });

  it('calculates at once when shown, then after each change settles', () => {
    const { worker, controller } = setUp();
    controller.setVisible(true);
    expect(worker.sent).toHaveLength(1);
    expect(controller.state.calculating).toBe(true);
    worker.answerLast(42);
    expect(controller.state).toMatchObject({ calculating: false, stale: false, ms: 42 });
    controller.changed();
    expect(controller.state.stale).toBe(true);
    expect(worker.sent).toHaveLength(1);
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(worker.sent).toHaveLength(2);
  });

  it('marks an answer out of date when the scene changed while it was calculated', () => {
    const { worker, controller } = setUp();
    controller.setVisible(true);
    controller.changed();
    worker.answerLast();
    expect(controller.state.stale).toBe(true);
  });

  it('without auto, waits for Calculate', () => {
    const { worker, controller } = setUp();
    controller.setAuto(false);
    controller.setVisible(true);
    controller.changed();
    vi.advanceTimersByTime(THROTTLE_MS);
    expect(worker.sent).toHaveLength(0);
    controller.calculate();
    expect(worker.sent).toHaveLength(1);
  });

  it('sends the settings and options it was given, and the scene’s products as data', () => {
    const { worker, controller } = setUp();
    controller.setSettings({ ...controller.settings, maintenanceFactor: 0.7 });
    controller.setOptions({
      ...controller.options,
      bouncedLight: false,
      furnitureInBouncedLight: false,
    });
    controller.setVisible(true);
    const sent = worker.sent[0]!;
    expect(sent.settings.maintenanceFactor).toBe(0.7);
    expect(sent.options.bouncedLight).toBe(false);
    expect(sent.snapshot.products).toEqual([product]);
  });
});
