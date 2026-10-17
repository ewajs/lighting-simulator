// The illuminance calculation's Web Worker (ADRs 0028, 0064, 0067): it takes
// a request, calculates or reads the light at a point, and answers, so the 3D
// view never waits for it.
import { AnalysisService, type AnalysisRequest, type ProbeRequest } from './analysis-request';

const service = new AnalysisService();

self.addEventListener('message', (event: MessageEvent<AnalysisRequest | ProbeRequest>) => {
  const message = event.data;
  self.postMessage(
    message.type === 'probe'
      ? service.probe(message)
      : service.analyse(message, () => performance.now()),
  );
});
