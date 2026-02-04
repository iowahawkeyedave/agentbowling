export interface Agent {
  id: string;
  name: string;
  twitter_handle: string | null;
  elo: number;
  matches_played: number;
  wins: number;
  losses: number;
  high_score: number;
  average_score: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  agent1_id: string | null;
  agent2_id: string | null;
  winner_id: string | null;
  agent1_score: number;
  agent2_score: number;
  agent1_frames: string;
  agent2_frames: string;
  replay_data: string;
  spectators: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface QueueStatus {
  queueSize: number;
  waiting: Array<{
    agentId: string;
    elo: number;
    waitingSince: string;
  }>;
}

export interface LeaderboardEntry extends Agent {
  rank: number;
}

export interface MatchResult {
  id: string;
  status: string;
  agent1Score: number;
  agent2Score: number;
  winnerId: string | null;
  eloChanges: {
    [key: string]: number;
  };
}

export interface BowlingFrame {
  frameNumber: number;
  rolls: number[];
  score: number;
  isStrike: boolean;
  isSpare: boolean;
}

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

export interface ReplayFrame {
  ball: BallThrow;
  pinFalls: PinFall[];
  remainingPins: number[];
  timestamp: number;
}
