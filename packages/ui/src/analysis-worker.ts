// The illuminance calculation's Web Worker (ADR 0028, 0064): it takes a
// request, calculates, and answers, so the 3D view never waits for it.
import { runAnalysis, type AnalysisRequest } from './analysis-request';

self.addEventListener('message', (event: MessageEvent<AnalysisRequest>) => {
  self.postMessage(runAnalysis(event.data, () => performance.now()));
});
