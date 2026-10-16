// Prints accuracy/REPORT.md (npm run accuracy:report).
import { accuracySummary, reportMarkdown } from './report';

console.log(reportMarkdown(accuracySummary()).trimEnd());
