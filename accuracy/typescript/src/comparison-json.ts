// Prints accuracy/comparison.json (npm run accuracy:report).
import { comparisonJson, roomComparison } from './comparison';
import { IES_FILES, REFERENCES } from './inputs';

const rooms = Object.entries(REFERENCES).map(([name, reference]) =>
  roomComparison(name, reference, IES_FILES),
);
console.log(comparisonJson(rooms).trimEnd());
