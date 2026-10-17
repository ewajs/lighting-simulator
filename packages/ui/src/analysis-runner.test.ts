import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
} from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import type { AnalysisRequest, AnalysisResponse } from './analysis-request';
import { AnalysisRunner, THROTTLE_MS, type WorkerLike } from './analysis-runner';

/** A worker that keeps what it's sent and answers when told to. */
class FakeWorker implements WorkerLike {
  sent: AnalysisRequest[] = [];
  terminated = false;
  #onMessage: ((event: MessageEvent<AnalysisResponse>) => void) | undefined;
  #onError: ((event: ErrorEvent) => void) | undefined;
  postMessage(message: AnalysisRequest): void {
    this.sent.push(message);
  }
  addEventListener(type: 'message' | 'error', listener: never): void {
    if (type === 'message') this.#onMessage = listener;
    else this.#onError = listener;
  }
  terminate(): void {
    this.terminated = true;
  }
  answer(id: number): void {
    this.#onMessage!({ data: { id, error: 'stand-in' } } as MessageEvent<AnalysisResponse>);
  }
  fail(message: string): void {
    this.#onError!({ message } as ErrorEvent);
  }
}

/** Timers run by hand: `tick` fires every timer due. */
function clock() {
  let now = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  let next = 1;
  // Ids stand in for the runtime's timer handles.
  type Timer = ReturnType<typeof setTimeout>;
  return {
    setTimer: (callback: () => void, ms: number) => {
      timers.set(next, { at: now + ms, callback });
      return next++;
    },
    clearTimer: (id: Timer) => void timers.delete(id),
    tick(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

const request = (width: number): Omit<AnalysisRequest, 'id'> => ({
  scene: { room: { ...DEFAULT_ROOM, width }, luminaires: [], furniture: [] },
  snapshot: { products: [], photometry: {}, modelFiles: {} },
  settings: DEFAULT_ANALYSIS_SETTINGS,
  options: DEFAULT_CALCULATION_OPTIONS,
});

function setUp() {
  const worker = new FakeWorker();
  const time = clock();
  const responses: AnalysisResponse[] = [];
  let starts = 0;
  const runner = new AnalysisRunner({
    worker,
    onResponse: (response) => responses.push(response),
    onStart: () => starts++,
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
  });
  return { worker, time, responses, runner, starts: () => starts };
}

describe('AnalysisRunner', () => {
  it('waits THROTTLE_MS after the last request, then sends only that one', () => {
    const { worker, time, runner } = setUp();
    runner.request(request(4));
    time.tick(THROTTLE_MS - 1);
    runner.request(request(5));
    time.tick(THROTTLE_MS - 1);
    expect(worker.sent).toHaveLength(0);
    time.tick(1);
    expect(worker.sent.map((r) => r.scene.room.width)).toEqual([5]);
  });

  it('runs one at a time: a request made meanwhile goes when the running one answers', () => {
    const { worker, time, runner, responses, starts } = setUp();
    runner.requestNow(request(4));
    runner.request(request(5));
    runner.request(request(6));
    time.tick(THROTTLE_MS);
    expect(worker.sent.map((r) => r.scene.room.width)).toEqual([4]);
    worker.answer(worker.sent[0]!.id);
    expect(responses).toHaveLength(1);
    expect(worker.sent.map((r) => r.scene.room.width)).toEqual([4, 6]);
    expect(starts()).toBe(2);
  });

  it('ignores an answer to a request it didn’t send last', () => {
    const { worker, runner, responses } = setUp();
    runner.requestNow(request(4));
    worker.answer(999);
    expect(responses).toHaveLength(0);
  });

  it('reports a worker failure as an answer with the error', () => {
    const { worker, runner, responses } = setUp();
    runner.requestNow(request(4));
    worker.fail('out of memory');
    expect(responses).toEqual([{ id: 1, error: 'out of memory' }]);
  });

  it('stops the worker when disposed', () => {
    const { worker, runner } = setUp();
    runner.dispose();
    expect(worker.terminated).toBe(true);
  });
});
