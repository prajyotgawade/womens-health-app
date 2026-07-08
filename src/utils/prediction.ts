import { addDays, subDays, differenceInDays, isAfter, startOfDay } from 'date-fns';

export interface CycleInput {
  startDate: string; // ISO string
  endDate: string | null; // null if currently active
}

export interface PredictionOutput {
  nextPeriodStart: Date;
  nextPeriodEnd: Date;
  ovulationDate: Date;
  fertilityWindowStart: Date;
  fertilityWindowEnd: Date;
  pmsStart: Date;
  pmsEnd: Date;
  isDelayed: boolean;
  daysDelayed: number;
  isIrregular: boolean;
  averageCycleLength: number;
  averagePeriodLength: number;
}

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_PHASE_LENGTH = 14;

/**
 * Core Prediction Engine
 * Analyzes historical cycles to calculate future reproductive health windows.
 */
export function generatePredictions(pastCycles: CycleInput[], currentDateStr: string = new Date().toISOString()): PredictionOutput | null {
  if (!pastCycles || pastCycles.length === 0) {
    return null; // Not enough data to predict
  }

  const currentDate = startOfDay(new Date(currentDateStr));

  // Sort cycles by start date (oldest to newest)
  const sorted = [...pastCycles].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // 1. Calculate Averages & Irregularity
  let totalCycleDays = 0;
  let totalPeriodDays = 0;
  let cycleCount = 0;
  let periodCount = 0;

  let minCycleLength = Infinity;
  let maxCycleLength = -Infinity;

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentStart = startOfDay(new Date(sorted[i].startDate));
    const nextStart = startOfDay(new Date(sorted[i + 1].startDate));
    const cycleLength = differenceInDays(nextStart, currentStart);

    totalCycleDays += cycleLength;
    cycleCount++;

    if (cycleLength < minCycleLength) minCycleLength = cycleLength;
    if (cycleLength > maxCycleLength) maxCycleLength = cycleLength;
  }

  for (const cycle of sorted) {
    if (cycle.endDate) {
      const pLength = differenceInDays(startOfDay(new Date(cycle.endDate)), startOfDay(new Date(cycle.startDate))) + 1;
      totalPeriodDays += pLength;
      periodCount++;
    }
  }

  const averageCycleLength = cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : DEFAULT_CYCLE_LENGTH;
  const averagePeriodLength = periodCount > 0 ? Math.round(totalPeriodDays / periodCount) : DEFAULT_PERIOD_LENGTH;

  // Irregularity: If the variance between shortest and longest cycle is > 8 days
  const isIrregular = cycleCount > 1 ? (maxCycleLength - minCycleLength > 8) : false;

  // 2. Predict Future Dates
  const latestCycleStart = startOfDay(new Date(sorted[sorted.length - 1].startDate));
  const nextPeriodStart = addDays(latestCycleStart, averageCycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, averagePeriodLength - 1);

  // Ovulation is typically 14 days BEFORE the next period
  const ovulationDate = subDays(nextPeriodStart, LUTEAL_PHASE_LENGTH);

  // Fertility window: 5 days before ovulation to 1 day after
  const fertilityWindowStart = subDays(ovulationDate, 5);
  const fertilityWindowEnd = addDays(ovulationDate, 1);

  // PMS window: 7 days before next period to 1 day before
  const pmsStart = subDays(nextPeriodStart, 7);
  const pmsEnd = subDays(nextPeriodStart, 1);

  // 3. Delay Detection
  let isDelayed = false;
  let daysDelayed = 0;

  if (isAfter(currentDate, nextPeriodStart)) {
    isDelayed = true;
    daysDelayed = differenceInDays(currentDate, nextPeriodStart);
  }

  return {
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertilityWindowStart,
    fertilityWindowEnd,
    pmsStart,
    pmsEnd,
    isDelayed,
    daysDelayed,
    isIrregular,
    averageCycleLength,
    averagePeriodLength
  };
}
