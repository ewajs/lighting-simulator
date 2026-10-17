// The illuminance calculation's Web Worker (ADR 0028, 0064): it takes a
// request, calculates, and answers, so the 3D view never waits for it.
import { AnalysisCache } from '@luxstudio/core/analysis';
import { runAnalysis, type AnalysisRequest } from './analysis-request';

/** The room's form factors and grid views, kept for the next request (ADR 0065). */
const cache = new AnalysisCache();

self.addEventListener('message', (event: MessageEvent<AnalysisRequest>) => {
  self.postMessage(runAnalysis(event.data, () => performance.now(), cache));
});
