import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function query(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

export interface MatchmakingResult {
  matchId: string;
  agent1Id: string;
  agent2Id: string;
}

export class MatchmakingService {
  private queue: Map<string, { agentId: string; elo: number; createdAt: Date; preferredRange: number }>;

  constructor() {
    this.queue = new Map();
  }

  async addToQueue(agentId: string, preferredEloRange: number = 100): Promise<{ queueId: string; position: number }> {
    const agents = await query('SELECT * FROM agents WHERE id = ?', [agentId]);
    const agent = agents[0];

    if (!agent) {
      throw new Error('Agent not found');
    }

    const queueId = uuidv4();
    this.queue.set(queueId, {
      agentId,
      elo: agent.elo,
      createdAt: new Date(),
      preferredRange: preferredEloRange,
    });

    const position = this.getQueuePosition(queueId);
    return { queueId, position };
  }

  async removeFromQueue(agentId: string): Promise<void> {
    for (const [queueId, entry] of this.queue.entries()) {
      if (entry.agentId === agentId) {
        this.queue.delete(queueId);
        break;
      }
    }
  }

  async findMatch(agentId: string): Promise<MatchmakingResult | null> {
    const agents = await query('SELECT * FROM agents WHERE id = ?', [agentId]);
    if (agents.length === 0) return null;

    const agentEntry = Array.from(this.queue.entries()).find(([_, entry]) => entry.agentId === agentId);
    if (!agentEntry) return null;

    const [queueId, entry] = agentEntry;
    const bestMatch = this.findBestMatch(entry);

    if (bestMatch) {
      this.queue.delete(queueId);
      this.queue.delete(bestMatch.queueId);

      const matchId = uuidv4();
      const now = Date.now();
      
      await client.execute({
        sql: `INSERT INTO matches (id, status, agent1_id, agent2_id, agent1_score, agent2_score, agent1_frames, agent2_frames, replay_data, spectators, created_at)
              VALUES (?, 'pending', ?, ?, 0, 0, '[]', '[]', '[]', 0, ?)`,
        args: [matchId, agentId, bestMatch.agentId, now],
      });

      return {
        matchId,
        agent1Id: agentId,
        agent2Id: bestMatch.agentId,
      };
    }

    return null;
  }

  private findBestMatch(agentEntry: { agentId: string; elo: number; preferredRange: number }): { queueId: string; agentId: string; elo: number } | null {
    let bestMatch: { queueId: string; agentId: string; elo: number } | null = null;
    let bestScore = Infinity;

    for (const [queueId, entry] of this.queue.entries()) {
      if (entry.agentId === agentEntry.agentId) continue;

      const eloDiff = Math.abs(entry.elo - agentEntry.elo);
      
      if (eloDiff <= agentEntry.preferredRange) {
        const timeScore = (entry.createdAt.getTime() - agentEntry.createdAt.getTime()) / 1000;
        const totalScore = eloDiff + Math.abs(timeScore) * 0.1;

        if (totalScore < bestScore) {
          bestScore = totalScore;
          bestMatch = { queueId, agentId: entry.agentId, elo: entry.elo };
        }
      }
    }

    return bestMatch;
  }

  getQueuePosition(queueId: string): number {
    const entries = Array.from(this.queue.entries()).sort((a, b) => 
      a[1].createdAt.getTime() - b[1].createdAt.getTime()
    );
    return entries.findIndex(([id]) => id === queueId) + 1;
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  getQueueList(): Array<{ agentId: string; elo: number; waitingSince: string }> {
    return Array.from(this.queue.entries()).map(([queueId, entry]) => ({
      agentId: entry.agentId,
      elo: entry.elo,
      waitingSince: entry.createdAt.toISOString(),
    }));
  }
}

export const matchmakingService = new MatchmakingService();
