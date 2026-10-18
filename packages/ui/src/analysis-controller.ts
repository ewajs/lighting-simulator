import {
  analysisSnapshot,
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CALCULATION_OPTIONS,
  type AnalysisInputs,
  type AnalysisSettings,
  type CalculationOptions,
  type Scene,
  type Simulator,
  type Vec3,
} from '@luxstudio/core';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { AnalysisResponse } from './analysis-request';
import { analysisWorker, AnalysisRunner, type WorkerLike } from './analysis-runner';
import { NO_ANALYSIS, type AnalysisState } from './lxs-analysis-panel';

/**
 * Whether a scene has anything to light it: luminaires, or windows letting
 * daylight in (ADR 0080). Without either there's nothing to calculate.
 */
export function hasLightToCalculate(scene: Scene): boolean {
  return scene.luminaires.length > 0 || scene.windows.length > 0;
}

/**
 * The app's illuminance calculation (ADR 0064): what it's set to, where it
 * stands, and when it runs. It calculates while someone is looking (the
 * Analysis panel is open) and, with `auto`, as the scene changes; the work
 * runs in a Web Worker, so the 3D view never waits. Settings are UI state,
 * not part of the scene.
 */
export class AnalysisController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #createWorker: () => WorkerLike;
  #runner: AnalysisRunner | undefined;
  #simulator: Simulator | undefined;
  #unsubscribe: (() => void) | undefined;
  /** Counts changes, so an answer can tell whether the scene moved on meanwhile. */
  #changes = 0;
  #changesSent = 0;
  #visible = false;
  /** The point last probed, so a new calculation reads it again. */
  #probed: { readonly point: Vec3; readonly normal: Vec3 } | undefined;

  state: AnalysisState = NO_ANALYSIS;
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS;
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS;
  auto = true;

  constructor(host: ReactiveControllerHost, createWorker: () => WorkerLike = analysisWorker) {
    this.#host = host;
    this.#createWorker = createWorker;
    host.addController(this);
  }

  /** Stops listening and stops the worker when the host leaves the page. */
  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#runner?.dispose();
    this.#runner = undefined;
  }

  /** The simulator to calculate for: its scene, and the photometry and models as they load. */
  setSimulator(simulator: Simulator | undefined): void {
    this.#unsubscribe?.();
    this.#simulator = simulator;
    // A product's IES file or model arriving changes the light.
    this.#unsubscribe = simulator?.onAssetSettled(() => this.changed());
    this.changed();
  }

  /** Whether the results are on screen: they're calculated only then. */
  setVisible(visible: boolean): void {
    if (visible === this.#visible) return;
    this.#visible = visible;
    if (visible && this.state.stale) this.#request(true);
  }

  /** Something the light depends on changed: the scene, or an asset. */
  changed(): void {
    this.#changes++;
    if (!this.state.stale) this.#set({ stale: true });
    this.#request(false);
  }

  /** New work plane, border or maintenance factor: recalculates. */
  setSettings(settings: AnalysisSettings): void {
    this.settings = settings;
    this.changed();
  }

  /** New calculation options, such as bounced light on or off: recalculates. */
  setOptions(options: CalculationOptions): void {
    this.options = options;
    this.changed();
  }

  /** Whether to recalculate as things change; turned on, it catches up at once. */
  setAuto(auto: boolean): void {
    this.auto = auto;
    this.#host.requestUpdate();
    if (auto && this.state.stale) this.#request(true);
  }

  /**
   * Reads the light at a point of a calculated surface, from the last
   * calculation (ADR 0067); read again after each new one. The answer
   * arrives in `state.probe`.
   */
  probe(point: Vec3, normal: Vec3): void {
    this.#probed = { point, normal };
    (this.#runner ?? this.#createRunner()).probe(point, normal);
  }

  /** Stops probing: the pointer left the surfaces. */
  clearProbe(): void {
    this.#probed = undefined;
    if (this.state.probe) this.#set({ probe: undefined });
  }

  /** The Calculate button: now, whether `auto` is on or not. */
  calculate(): void {
    this.#request(true, true);
  }

  #request(soon: boolean, forced = false): void {
    const simulator = this.#simulator;
    if (!simulator || !this.#visible || !(this.auto || forced)) return;
    const scene = simulator.scene;
    if (!hasLightToCalculate(scene)) {
      // Last results would describe light that's gone: drop them.
      if (this.state.analysis || this.state.stale) {
        this.#set({ analysis: undefined, probe: undefined, stale: false, calculating: false });
      }
      return;
    }
    const inputs: AnalysisInputs = {
      catalog: simulator.catalog,
      photometry: (id) => simulator.photometry(id),
      modelFile: (id) => simulator.model(id),
    };
    const request = {
      scene,
      snapshot: analysisSnapshot(scene, inputs),
      settings: this.settings,
      options: this.options,
    };
    const runner = this.#runner ?? this.#createRunner();
    if (soon) runner.requestNow(request);
    else runner.request(request);
  }

  #createRunner(): AnalysisRunner {
    this.#runner = new AnalysisRunner({
      worker: this.#createWorker(),
      onStart: () => {
        this.#changesSent = this.#changes;
        this.#set({ calculating: true });
      },
      onResponse: (response) => this.#onResponse(response),
      onProbe: (response) => {
        if (this.#probed) this.#set({ probe: response.illuminance });
      },
    });
    return this.#runner;
  }

  #onResponse(response: AnalysisResponse): void {
    // Answered after the last light went: nothing to show.
    if (this.#simulator && !hasLightToCalculate(this.#simulator.scene)) {
      this.#set({ calculating: false });
      return;
    }
    const stale = this.#changesSent !== this.#changes;
    if ('error' in response) {
      this.#simulator?.logger.error(`[analysis] The calculation failed: ${response.error}`);
      this.#set({ calculating: false, error: response.error, stale });
      return;
    }
    this.#simulator?.logger.debug(
      `[analysis] Calculated in ${Math.round(response.ms)} ms over ${response.analysis.indirect.patches} patches` +
        (response.roomReused ? ", reusing the room's form factors" : ''),
    );
    this.#set({
      analysis: response.analysis,
      ms: response.ms,
      error: undefined,
      calculating: false,
      stale,
    });
    // A probed point shows the new light too.
    if (this.#probed) this.#runner?.probe(this.#probed.point, this.#probed.normal);
  }

  #set(change: Partial<AnalysisState>): void {
    this.state = { ...this.state, ...change };
    this.#host.requestUpdate();
  }
}
