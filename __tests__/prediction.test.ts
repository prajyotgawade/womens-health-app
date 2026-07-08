import { generatePredictions, CycleInput } from '../src/utils/prediction';
import { startOfDay } from 'date-fns';

describe('Phase 9 Prediction Engine', () => {
  it('should safely return null if insufficient data is provided', () => {
    expect(generatePredictions([])).toBeNull();
  });

  it('should accurately calculate the exact start date of the next period', () => {
    const mockCycles: CycleInput[] = [
      { startDate: '2023-01-01T00:00:00.000Z', endDate: '2023-01-05T00:00:00.000Z' },
      { startDate: '2023-01-29T00:00:00.000Z', endDate: '2023-02-02T00:00:00.000Z' } // Exact 28 day cycle
    ];
    
    const predictions = generatePredictions(mockCycles, '2023-02-15T00:00:00.000Z');
    
    expect(predictions).not.toBeNull();
    
    // The next period should be exactly 28 days after Jan 29 = Feb 26
    const expectedNextPeriod = startOfDay(new Date('2023-02-26T00:00:00.000Z'));
    
    expect(predictions?.nextPeriodStart).toEqual(expectedNextPeriod);
    expect(predictions?.averageCycleLength).toBe(28);
    expect(predictions?.isIrregular).toBe(false);
  });
  
  it('should accurately detect cycle delays', () => {
    const mockCycles: CycleInput[] = [
      { startDate: '2023-01-01T00:00:00.000Z', endDate: '2023-01-05T00:00:00.000Z' },
      { startDate: '2023-01-29T00:00:00.000Z', endDate: '2023-02-02T00:00:00.000Z' }
    ];
    
    // Simulate the user checking the app on March 1st (Period was due Feb 26)
    const predictions = generatePredictions(mockCycles, '2023-03-01T00:00:00.000Z');
    
    expect(predictions?.isDelayed).toBe(true);
    expect(predictions?.daysDelayed).toBe(3); // 26th -> 1st is ~3 days (Feb has 28)
  });
});
