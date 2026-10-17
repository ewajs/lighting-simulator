// Runs the illuminance calculation in a Web Worker for the app (ADR 0064):
// throttled, so a drag doesn't queue a calculation per frame, and latest-wins,
// so only the scene as it is now is calculated next.
import type { AnalysisRequest, AnalysisResponse } from './analysis-request';

/** How long a change waits for more before it's calculated, in ms: a drag's moves come every frame. */
export const THROTTLE_MS = 250;

/** A pending timer, as `setTimeout` returns it. */
type Timer = ReturnType<typeof setTimeout>;

/** What the runner needs from a worker: the browser's Worker, or a stand-in in tests. */
export interface WorkerLike {
  /** Sends a calculation to run. */
  postMessage(message: AnalysisRequest): void;
  /** Hears each answer. */
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AnalysisResponse>) => void,
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
  #waiting: Omit<AnalysisRequest, 'id'> | undefined;
  #timer: Timer | undefined;
  #nextId = 1;

  constructor(options: {
    worker: WorkerLike;
    onResponse: (response: AnalysisResponse) => void;
    onStart?: () => void;
    setTimer?: (callback: () => void, ms: number) => Timer;
    clearTimer?: (timer: Timer) => void;
  }) {
    this.#worker = options.worker;
    this.#onResponse = options.onResponse;
    this.#onStart = options.onStart ?? (() => {});
    this.#setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.#clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
    this.#worker.addEventListener('message', (event) => {
      if (event.data.id !== this.#running) return;
      this.#running = undefined;
      this.#onResponse(event.data);
      this.#sendWaiting();
    });
    this.#worker.addEventListener('error', (event) => {
      const id = this.#running ?? 0;
      this.#running = undefined;
      this.#onResponse({ id, error: event.message || 'The analysis worker failed' });
    });
  }

  /** Calculates `request` soon: after THROTTLE_MS without another, and once the running one is done. */
  request(request: Omit<AnalysisRequest, 'id'>): void {
    this.#waiting = request;
    if (this.#timer !== undefined) this.#clearTimer(this.#timer);
    this.#timer = this.#setTimer(() => {
      this.#timer = undefined;
      if (this.#running === undefined) this.#sendWaiting();
    }, THROTTLE_MS);
  }

  /** Calculates `request` now, or as soon as the running one is done. */
  requestNow(request: Omit<AnalysisRequest, 'id'>): void {
    if (this.#timer !== undefined) this.#clearTimer(this.#timer);
    this.#timer = undefined;
    this.#waiting = request;
    if (this.#running === undefined) this.#sendWaiting();
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
    this.#worker.postMessage({ ...request, id: this.#running });
  }
}
