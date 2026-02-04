export interface BowlingState {
  currentFrame: number;
  currentRoll: number;
  pinsStanding: number[];
  scores: number[][];
  cumulativeScores: number[];
  isComplete: boolean;
  gameResult: GameResult | null;
}

export interface GameResult {
  totalScore: number;
  strikes: number;
  spares: number;
  openFrames: number;
  gutterBalls: number;
  splitConversions: number;
}

export interface BallThrow {
  x: number;
  y: number;
  speed: number;
  spin: number;
  angle: number;
}

export interface PinFall {
  pinIndex: number;
  delay: number;
  direction: number;
}

export interface FrameData {
  frameNumber: number;
  rolls: number[];
  score: number;
  isStrike: boolean;
  isSpare: boolean;
  isOpen: boolean;
}

export interface ReplayFrame {
  ball: BallThrow;
  pinFalls: PinFall[];
  remainingPins: number[];
  timestamp: number;
}

export interface MatchReplay {
  matchId: string;
  agent1Name: string;
  agent2Name: string;
  frames: ReplayFrame[][];
  finalScores: [number, number];
  timestamps: {
    start: number;
    end: number;
  };
}

const PIN_CONFIG = {
  positions: [
    { x: 0, y: 0 },      // Head pin (1)
    { x: -1, y: -2.6 },  // 2
    { x: 1, y: -2.6 },   // 3
    { x: -2, y: -5.2 },  // 4
    { x: 0, y: -5.2 },   // 5
    { x: 2, y: -5.2 },   // 6
    { x: -3, y: -7.8 },  // 7
    { x: -1, y: -7.8 },  // 8
    { x: 1, y: -7.8 },   // 9
    { x: 3, y: -7.8 },   // 10
  ],
  radius: 0.6,
  spacing: 2.6,
};

const LANE_LENGTH = 60;
const FOUL_LINE = 18;

export class BowlingEngine {
  private state: BowlingState;
  private replayData: ReplayFrame[];
  private startTime: number;

  constructor() {
    this.state = this.createInitialState();
    this.replayData = [];
    this.startTime = Date.now();
  }

  private createInitialState(): BowlingState {
    return {
      currentFrame: 1,
      currentRoll: 1,
      pinsStanding: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scores: [],
      cumulativeScores: [],
      isComplete: false,
      gameResult: null,
    };
  }

  simulateThrow(ball: BallThrow): { pinsDown: number[]; replayFrame: ReplayFrame } {
    const pinFalls = this.calculatePinFall(ball);
    const pinsDown = pinFalls.map(p => p.pinIndex);
    
    // Update pins standing
    pinFalls.forEach(pf => {
      if (pf.pinIndex < this.state.pinsStanding.length) {
        this.state.pinsStanding[pf.pinIndex] = 0;
      }
    });

    const replayFrame: ReplayFrame = {
      ball,
      pinFalls,
      remainingPins: [...this.state.pinsStanding],
      timestamp: Date.now() - this.startTime,
    };
    this.replayData.push(replayFrame);

    return { pinsDown, replayFrame };
  }

  private calculatePinFall(ball: BallThrow): PinFall[] {
    const pinFalls: PinFall[] = [];
    const hitThreshold = 0.8;

    // Head pin collision
    const headPinDist = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
    if (headPinDist < PIN_CONFIG.radius + hitThreshold) {
      pinFalls.push({ pinIndex: 0, delay: 0, direction: ball.spin });
    }

    // Calculate pin collisions based on ball trajectory
    for (let i = 1; i < PIN_CONFIG.positions.length; i++) {
      const pin = PIN_CONFIG.positions[i];
      const dist = Math.sqrt((ball.x - pin.x) ** 2 + (ball.y - pin.y) ** 2);
      
      if (dist < PIN_CONFIG.radius * 2 + hitThreshold) {
        const delay = Math.abs(pin.y - ball.y) * 0.05 + Math.random() * 0.1;
        pinFalls.push({ pinIndex: i, delay, direction: ball.spin + (Math.random() - 0.5) * 0.5 });
      }
    }

    // Secondary pin collisions (pin flying)
    const newPinsDown = pinFalls.map(p => p.pinIndex);
    for (let i = 0; i < this.state.pinsStanding.length; i++) {
      if (this.state.pinsStanding[i] === 0 || newPinsDown.includes(i)) continue;
      
      const pin = PIN_CONFIG.positions[i];
      for (const fallen of pinFalls) {
        const fallenPin = PIN_CONFIG.positions[fallen.pinIndex];
        const dist = Math.sqrt((pin.x - fallenPin.x) ** 2 + (pin.y - fallenPin.y) ** 2);
        
        if (dist < PIN_CONFIG.radius * 2.5) {
          const delay = fallen.delay + 0.05 + Math.random() * 0.1;
          pinFalls.push({ pinIndex: i, delay, direction: fallen.direction });
          break;
        }
      }
    }

    return pinFalls.sort((a, b) => a.delay - b.delay);
  }

  recordRoll(pinsDown: number[], frameScores: number[][]) {
    const currentFrameScores = frameScores[this.state.currentFrame - 1] || [];
    currentFrameScores.push(pinsDown.length);
    frameScores[this.state.currentFrame - 1] = currentFrameScores;

    const frameData = this.calculateFrameScore(frameScores, this.state.currentFrame);
    
    if (this.state.scores[this.state.currentFrame - 1]) {
      this.state.scores[this.state.currentFrame - 1] = frameData;
    } else {
      this.state.scores.push(frameData);
    }

    this.updateCumulativeScores();
    this.advanceGameState(pinsDown.length, currentFrameScores);
  }

  private calculateFrameScore(frameScores: number[][], frame: number): number[] {
    const rolls = frameScores[frame - 1] || [];
    let score = 0;
    let rollIndex = 0;

    for (let f = 1; f <= frame; f++) {
      const fScores = frameScores[f - 1] || [];
      
      if (f < frame) {
        score += this.calculateFrameTotal(fScores, frameScores, rollIndex);
        rollIndex += fScores.length;
      } else {
        score = this.calculateFrameTotal(rolls, frameScores, rollIndex);
      }
    }

    return [score];
  }

  private calculateFrameTotal(rolls: number[], allFrames: number[][], startIndex: number): number {
    if (rolls.length === 0) return 0;

    const frameIndex = allFrames.indexOf(rolls);
    
    // Strike
    if (rolls[0] === 10) {
      const next1 = allFrames[frameIndex + 1]?.[0] ?? 0;
      const next2 = frameIndex + 1 > allFrames.length - 1 
        ? (allFrames[frameIndex + 2]?.[0] ?? 0)
        : (allFrames[frameIndex + 1]?.[1] ?? (allFrames[frameIndex + 2]?.[0] ?? 0));
      return 10 + next1 + next2;
    }
    
    // Spare
    if (rolls.length >= 2 && rolls[0] + rolls[1] === 10) {
      const next = allFrames[frameIndex + 1]?.[0] ?? 0;
      return 10 + next;
    }
    
    // Open frame
    return rolls.slice(0, 2).reduce((a, b) => a + b, 0);
  }

  private updateCumulativeScores() {
    let cumulative = 0;
    this.state.cumulativeScores = this.state.scores.map(frameScore => {
      cumulative += frameScore[0];
      return cumulative;
    });
  }

  private advanceGameState(pinsHit: number[], currentRolls: number[]) {
    const isStrike = pinsHit === 10 && this.state.currentRoll === 1;
    const isSpare = this.state.currentRoll === 2 && currentRolls[0] + pinsHit === 10;
    const isLastFrame = this.state.currentFrame === 10;

    if (isLastFrame) {
      if (isStrike || isSpare) {
        if (currentRolls.length === 3 || (isStrike && currentRolls.length === 2)) {
          this.state.isComplete = true;
          this.state.gameResult = this.calculateGameResult();
        } else {
          this.state.currentRoll = 2;
        }
      } else if (currentRolls.length === 2) {
        this.state.isComplete = true;
        this.state.gameResult = this.calculateGameResult();
      }
    } else {
      if (isStrike || this.state.currentRoll === 2) {
        this.state.currentFrame++;
        this.state.currentRoll = 1;
        this.resetPins();
      } else {
        this.state.currentRoll = 2;
      }
    }
  }

  private resetPins() {
    if (this.state.currentRoll === 1) {
      this.state.pinsStanding = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }
  }

  private calculateGameResult(): GameResult {
    let totalScore = 0;
    let strikes = 0;
    let spares = 0;
    let openFrames = 0;
    let gutterBalls = 0;
    let splitConversions = 0;

    // Simplified result calculation
    for (const frame of this.state.scores) {
      totalScore += frame[0] || 0;
    }

    return {
      totalScore,
      strikes,
      spares,
      openFrames,
      gutterBalls,
      splitConversions,
    };
  }

  getState(): BowlingState {
    return { ...this.state };
  }

  getReplayData(): ReplayFrame[] {
    return [...this.replayData];
  }

  getFinalScore(): number {
    if (this.state.cumulativeScores.length > 0) {
      return this.state.cumulativeScores[this.state.cumulativeScores.length - 1];
    }
    return 0;
  }
}

export function generateBotThrow(agentId: string, frame: number, roll: number, strategy?: string): BallThrow {
  const baseX = (Math.random() - 0.5) * 4;
  const baseY = 0;
  const baseSpeed = 15 + Math.random() * 5;
  const baseSpin = (Math.random() - 0.5) * 2;
  const baseAngle = Math.random() * 0.1 - 0.05;

  // Strategy-based adjustments
  let accuracyMod = 1;
  let powerMod = 0;

  switch (strategy) {
    case 'power':
      powerMod = 3;
      accuracyMod = 0.8;
      break;
    case 'precision':
      accuracyMod = 1.3;
      powerMod = -2;
      break;
    case 'defensive':
      accuracyMod = 1.1;
      powerMod = -1;
      break;
    default:
      break;
  }

  // Difficulty scaling based on ELO (simulated)
  const skillFactor = 0.5 + Math.random() * 0.5;
  
  return {
    x: baseX * accuracyMod * skillFactor,
    y: baseY,
    speed: Math.min(22, Math.max(12, baseSpeed + powerMod)),
    spin: baseSpin,
    angle: baseAngle * accuracyMod * skillFactor,
  };
}
