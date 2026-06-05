import { SignalCheck, SignalReport } from './signalEngine';

export interface ScoringResult {
  score: number;
  qualifies: boolean;
  breakdown: {
    vwapScore: number;
    emaScore: number;
    rsiScore: number;
    volumeScore: number;
    breakoutScore: number;
  };
}

export interface DualScoringResult {
  long: ScoringResult;
  short: ScoringResult;
  selectedType: 'CE' | 'PE' | 'NONE';
  selectedScore: number;
}

// Weights
const WEIGHTS = {
  vwapAlignment: 25,
  emaAlignment: 20,
  rsiConfirmation: 20,
  volumeSpike: 20,
  breakoutCandle: 15
};

/**
 * Calculates the weighted score for a signal check
 */
export function calculateScore(check: SignalCheck): ScoringResult {
  const vwapScore = check.vwapAlignment ? WEIGHTS.vwapAlignment : 0;
  const emaScore = check.emaAlignment ? WEIGHTS.emaAlignment : 0;
  const rsiScore = check.rsiConfirmation ? WEIGHTS.rsiConfirmation : 0;
  const volumeScore = check.volumeSpike ? WEIGHTS.volumeSpike : 0;
  const breakoutScore = check.breakoutCandle ? WEIGHTS.breakoutCandle : 0;

  const score = vwapScore + emaScore + rsiScore + volumeScore + breakoutScore;
  const qualifies = score >= 70;

  return {
    score,
    qualifies,
    breakdown: {
      vwapScore,
      emaScore,
      rsiScore,
      volumeScore,
      breakoutScore
    }
  };
}

/**
 * scoringEngine
 * Evaluates both long and short checks, and determines if a trade should be taken
 */
export function scoringEngine(report: SignalReport): DualScoringResult {
  const longResult = calculateScore(report.long);
  const shortResult = calculateScore(report.short);

  let selectedType: 'CE' | 'PE' | 'NONE' = 'NONE';
  let selectedScore = 0;

  if (longResult.qualifies && longResult.score >= shortResult.score) {
    selectedType = 'CE';
    selectedScore = longResult.score;
  } else if (shortResult.qualifies && shortResult.score >= longResult.score) {
    selectedType = 'PE';
    selectedScore = shortResult.score;
  }

  return {
    long: longResult,
    short: shortResult,
    selectedType,
    selectedScore
  };
}
