// Runs the illuminance calculation in a Web Worker for the app (ADR 0064):
// throttled, so a drag doesn't queue a calculation per frame, and latest-wins,
// so only the scene as it is now is calculated next.
import type { Vec3 } from '@luxstudio/core';
import type {
  AnalysisRequest,
  AnalysisResponse,
  ProbeRequest,
  ProbeResponse,
} from './analysis-request';

/** How long a change waits for more before it's calculated, in ms: a drag's moves come every frame. */
export const THROTTLE_MS = 250;

/** A pending timer, as `setTimeout` returns it. */
type Timer = ReturnType<typeof setTimeout>;

/** What the runner needs from a worker: the browser's Worker, or a stand-in in tests. */
export interface WorkerLike {
  /** Sends a calculation to run, or a point to read. */
  postMessage(message: AnalysisRequest | ProbeRequest): void;
  /** Hears each answer. */
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AnalysisResponse | ProbeResponse>) => void,
  ): void;
  /** Hears the worker failing. */
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  /** Stops the worker. */
  terminate(): void;
}

/** The analysis worker, bundled from analysis-worker.ts. */
export function analysisWorker(): WorkerLike {
  return new Worker(new URL('./analysis-worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Sends calculations to a worker one at a time. A request made while one runs
 * waits, and a newer one replaces it; requests also wait THROTTLE_MS for
 * more. `onResponse` hears every answer; `onStart` when one is sent.
 */
export class AnalysisRunner {
  readonly #worker: WorkerLike;
  readonly #onResponse: (response: AnalysisResponse) => void;
  readonly #onStart: () => void;
  readonly #setTimer: (callback: () => void, ms: number) => Timer;
  readonly #clearTimer: (timer: Timer) => void;
  #running: number | undefined;
  #waiting: Omit<AnalysisRequest, 'id' | 'type'> | undefined;
  readonly #onProbe: (response: ProbeResponse) => void;
  #lastProbe = 0;
  #timer: Timer | undefined;
  #nextId = 1;

  constructor(options: {
    worker: WorkerLike;
    onResponse: (response: AnalysisResponse) => void;
    onStart?: () => void;
    onProbe?: (response: ProbeResponse) => void;
    setTimer?: (callback: () => void, ms: number) => Timer;
    clearTimer?: (timer: Timer) => void;
  }) {
    this.#worker = options.worker;
    this.#onResponse = options.onResponse;
    this.#onStart = options.onStart ?? (() => {});
    this.#onProbe = options.onProbe ?? (() => {});
    this.#setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.#clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
    this.#worker.addEventListener('message', (event) => {
      const response = event.data;
      if (response.type === 'probe') {
        // Only the latest probe matters: the pointer has moved on from the others.
        if (response.id === this.#lastProbe) this.#onProbe(response);
        return;
      }
      if (response.id !== this.#running) return;
      this.#running = undefined;
      this.#onResponse(response);
      this.#sendWaiting();
    });
    this.#worker.addEventListener('error', (event) => {
      const id = this.#running ?? 0;
      this.#running = undefined;
      this.#onResponse({
        type: 'analyse',
        id,
        error: event.message || 'The analysis worker failed',
      });
    });
  }

  /** Calculates `request` soon: after THROTTLE_MS without another, and once the running one is done. */
  request(request: Omit<AnalysisRequest, 'id' | 'type'>): void {
    this.#waiting = request;
    if (this.#timer !== undefined) this.#clearTimer(this.#timer);
    this.#timer = this.#setTimer(() => {
      this.#timer = undefined;
      if (this.#running === undefined) this.#sendWaiting();
    }, THROTTLE_MS);
  }

  /** Calculates `request` now, or as soon as the running one is done. */
  requestNow(request: Omit<AnalysisRequest, 'id' | 'type'>): void {
    if (this.#timer !== undefined) this.#clearTimer(this.#timer);
    this.#timer = undefined;
    this.#waiting = request;
    if (this.#running === undefined) this.#sendWaiting();
  }

  /**
   * Reads the light at a point from the last calculation, at once: a probe
   * doesn't wait for the throttle. `onProbe` hears the answer to the latest.
   */
  probe(point: Vec3, normal: Vec3): void {
    this.#lastProbe++;
    this.#worker.postMessage({ type: 'probe', id: this.#lastProbe, point, normal });
  }

  /** Stops the worker; nothing more is answered. */
  dispose(): void {
    if (this.#timer !== undefined) this.#clearTimer(this.#timer);
    this.#worker.terminate();
  }

  #sendWaiting(): void {
    const request = this.#waiting;
    if (!request || this.#timer !== undefined) return;
    this.#waiting = undefined;
    this.#running = this.#nextId++;
    this.#onStart();
    this.#worker.postMessage({ ...request, type: 'analyse', id: this.#running });
  }
}
