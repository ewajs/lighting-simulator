import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
} from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import type {
  AnalysisRequest,
  AnalysisResponse,
  ProbeRequest,
  ProbeResponse,
} from './analysis-request';
import { AnalysisRunner, THROTTLE_MS, type WorkerLike } from './analysis-runner';

/** A worker that keeps what it's sent and answers when told to. */
class FakeWorker implements WorkerLike {
  sent: AnalysisRequest[] = [];
  probes: ProbeRequest[] = [];
  terminated = false;
  #onMessage: ((event: MessageEvent<AnalysisResponse | ProbeResponse>) => void) | undefined;
  #onError: ((event: ErrorEvent) => void) | undefined;
  postMessage(message: AnalysisRequest | ProbeRequest): void {
    if (message.type === 'probe') this.probes.push(message);
    else this.sent.push(message);
  }
  addEventListener(type: 'message' | 'error', listener: never): void {
    if (type === 'message') this.#onMessage = listener;
    else this.#onError = listener;
  }
  terminate(): void {
    this.terminated = true;
  }
  answer(id: number): void {
    this.#onMessage!({
      data: { type: 'analyse', id, error: 'stand-in' },
    } as MessageEvent<AnalysisResponse>);
  }
  answerProbe(id: number): void {
    const data: ProbeResponse = { type: 'probe', id, illuminance: undefined };
    this.#onMessage!({ data } as MessageEvent<ProbeResponse>);
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

const request = (width: number): Omit<AnalysisRequest, 'id' | 'type'> => ({
  scene: { room: { ...DEFAULT_ROOM, width }, luminaires: [], furniture: [], windows: [] },
  snapshot: { products: [], photometry: {}, modelFiles: {} },
  settings: DEFAULT_ANALYSIS_SETTINGS,
  options: DEFAULT_CALCULATION_OPTIONS,
});

function setUp() {
  const worker = new FakeWorker();
  const time = clock();
  const responses: AnalysisResponse[] = [];
  const probes: ProbeResponse[] = [];
  let starts = 0;
  const runner = new AnalysisRunner({
    worker,
    onResponse: (response) => responses.push(response),
    onProbe: (response) => probes.push(response),
    onStart: () => starts++,
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
  });
  return { worker, time, responses, probes, runner, starts: () => starts };
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
    expect(responses).toEqual([{ type: 'analyse', id: 1, error: 'out of memory' }]);
  });

  it('sends probes at once, and hears only the answer to the latest', () => {
    const { worker, runner, probes } = setUp();
    runner.probe({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    runner.probe({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(worker.probes.map((p) => p.point.x)).toEqual([0, 1]);
    worker.answerProbe(worker.probes[0]!.id);
    expect(probes).toHaveLength(0);
    worker.answerProbe(worker.probes[1]!.id);
    expect(probes).toHaveLength(1);
  });

  it('stops the worker when disposed', () => {
    const { worker, runner } = setUp();
    runner.dispose();
    expect(worker.terminated).toBe(true);
  });
});
