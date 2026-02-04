export const K_FACTOR = 32;
export const INITIAL_ELO = 1200;

export interface EloResult {
  winnerElo: number;
  loserElo: number;
  winnerChange: number;
  loserChange: number;
}

export function calculateElo(
  winnerElo: number,
  loserElo: number,
  kFactor: number = K_FACTOR
): EloResult {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));

  return {
    winnerElo: winnerElo + winnerChange,
    loserElo: loserElo + loserChange,
    winnerChange,
    loserChange,
  };
}

export function calculateDrawElo(elo1: number, elo2: number, kFactor: number = K_FACTOR): [number, number] {
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 - expected1;

  const change1 = Math.round(kFactor * (0.5 - expected1));
  const change2 = Math.round(kFactor * (0.5 - expected2));

  return [elo1 + change1, elo2 + change2];
}

export function calculateNewElos(
  score1: number,
  score2: number,
  elo1: number,
  elo2: number
): { agent1NewElo: number; agent2NewElo: number; eloChanges: [number, number] } {
  const kFactor = K_FACTOR;

  if (score1 === score2) {
    const [newElo1, newElo2] = calculateDrawElo(elo1, elo2, kFactor);
    return {
      agent1NewElo: newElo1,
      agent2NewElo: newElo2,
      eloChanges: [newElo1 - elo1, newElo2 - elo2],
    };
  }

  const winnerElo = score1 > score2 ? elo1 : elo2;
  const loserElo = score1 > score2 ? elo2 : elo1;
  const result = calculateElo(winnerElo, loserElo, kFactor);

  if (score1 > score2) {
    return {
      agent1NewElo: result.winnerElo,
      agent2NewElo: result.loserElo,
      eloChanges: [result.winnerChange, result.loserChange],
    };
  } else {
    return {
      agent1NewElo: result.loserElo,
      agent2NewElo: result.winnerElo,
      eloChanges: [result.loserChange, result.winnerChange],
    };
  }
}

export function getEloTier(elo: number): string {
  if (elo >= 2000) return 'Legend';
  if (elo >= 1800) return 'Master';
  if (elo >= 1600) return 'Expert';
  if (elo >= 1400) return 'Advanced';
  if (elo >= 1200) return 'Intermediate';
  if (elo >= 1000) return 'Novice';
  return 'Beginner';
}

export function getEloRank(elo: number): number {
  const tiers = [
    { min: 2000, rank: 1 },
    { min: 1900, rank: 2 },
    { min: 1800, rank: 3 },
    { min: 1700, rank: 4 },
    { min: 1600, rank: 5 },
    { min: 1500, rank: 6 },
    { min: 1400, rank: 7 },
    { min: 1300, rank: 8 },
    { min: 1200, rank: 9 },
    { min: 1100, rank: 10 },
    { min: 1000, rank: 11 },
    { min: 900, rank: 12 },
    { min: 800, rank: 13 },
    { min: 700, rank: 14 },
    { min: 600, rank: 15 },
    { min: 500, rank: 16 },
    { min: 400, rank: 17 },
    { min: 300, rank: 18 },
    { min: 200, rank: 19 },
    { min: 100, rank: 20 },
    { min: 0, rank: 21 },
  ];

  const tier = tiers.find(t => elo >= t.min);
  return tier?.rank || 21;
}
