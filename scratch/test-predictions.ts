import { generatePredictions } from '../src/utils/prediction';
import { format } from 'date-fns';

const MOCK_CYCLES = [
  { startDate: '2023-01-01T00:00:00.000Z', endDate: '2023-01-05T00:00:00.000Z' },
  { startDate: '2023-01-29T00:00:00.000Z', endDate: '2023-02-03T00:00:00.000Z' }, // 28 days
  { startDate: '2023-02-28T00:00:00.000Z', endDate: '2023-03-05T00:00:00.000Z' }, // 30 days
  { startDate: '2023-03-27T00:00:00.000Z', endDate: '2023-03-31T00:00:00.000Z' }, // 27 days
];

const result = generatePredictions(MOCK_CYCLES, '2023-04-20T00:00:00.000Z');

if (result) {
  console.log('--- PREDICTION ENGINE RESULTS ---');
  console.log('Average Cycle Length:', result.averageCycleLength, 'days');
  console.log('Average Period Length:', result.averagePeriodLength, 'days');
  console.log('Irregular Cycle:', result.isIrregular);
  console.log('Next Period:', format(result.nextPeriodStart, 'MMM dd, yyyy'));
  console.log('Ovulation Date:', format(result.ovulationDate, 'MMM dd, yyyy'));
  console.log('Fertility Window:', format(result.fertilityWindowStart, 'MMM dd'), '-', format(result.fertilityWindowEnd, 'MMM dd'));
  console.log('PMS Window:', format(result.pmsStart, 'MMM dd'), '-', format(result.pmsEnd, 'MMM dd'));
  console.log('Is Delayed:', result.isDelayed);
} else {
  console.log('Not enough data to predict.');
}
