// Prints accuracy/summary.json (npm run accuracy:report).
import { accuracySummary, summaryJson } from './report';

console.log(summaryJson(accuracySummary()).trimEnd());
