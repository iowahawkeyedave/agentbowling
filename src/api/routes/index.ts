import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@libsql/client';
import { BowlingEngine, generateBotThrow } from '../services/bowlingEngine.js';
import { matchmakingService } from '../services/matchmaking.js';
import { calculateNewElos } from '../services/eloEngine.js';

const url = process.env.TURSO_DATABASE_URL || 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

export const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function query(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function run(sql, args = []) {
  await client.execute({ sql, args });
}

apiRouter.post('/agents', async (req, res) => {
  try {
    const { name, twitterHandle } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const now = Date.now();
    
    await run(
      `INSERT INTO agents (id, name, twitter_handle, elo, matches_played, wins, losses, high_score, average_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, twitterHandle || null, 1200, 0, 0, 0, 0, 0, now, now]
    );

    const agents = await query('SELECT * FROM agents WHERE id = ?', [id]);
    res.json(agents[0]);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

apiRouter.get('/agents', async (req, res) => {
  try {
    const agents = await query('SELECT * FROM agents ORDER BY elo DESC');
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

apiRouter.get('/agents/:id', async (req, res) => {
  try {
    const agents = await query('SELECT * FROM agents WHERE id = ?', [req.params.id]);
    const agent = agents[0];
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

apiRouter.get('/leaderboard', async (req, res) => {
  try {
    const agents = await query('SELECT * FROM agents ORDER BY elo DESC LIMIT 100');
    const leaderboard = agents.map((agent, index) => ({
      rank: index + 1,
      ...agent,
    }));
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

apiRouter.post('/queue/join', async (req, res) => {
  try {
    const { agentId, preferredEloRange } = req.body;
    const result = await matchmakingService.addToQueue(agentId, preferredEloRange);
    res.json(result);
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

apiRouter.post('/queue/leave', async (req, res) => {
  try {
    const { agentId } = req.body;
    await matchmakingService.removeFromQueue(agentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

apiRouter.get('/queue/status', async (req, res) => {
  const queue = matchmakingService.getQueueList();
  res.json({
    queueSize: matchmakingService.getQueueSize(),
    waiting: queue,
  });
});

apiRouter.post('/match/create', async (req, res) => {
  try {
    const { agent1Id, agent2Id } = req.body;

    if (!agent1Id || !agent2Id) {
      return res.status(400).json({ error: 'Both agent IDs are required' });
    }

    const matchId = uuidv4();
    const now = Date.now();
    
    await run(
      `INSERT INTO matches (id, status, agent1_id, agent2_id, agent1_score, agent2_score, agent1_frames, agent2_frames, replay_data, spectators, created_at)
       VALUES (?, 'pending', ?, ?, 0, 0, '[]', '[]', '[]', 0, ?)`,
      [matchId, agent1Id, agent2Id, now]
    );

    const matches = await query('SELECT * FROM matches WHERE id = ?', [matchId]);
    res.json(matches[0]);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

apiRouter.post('/match/:id/start', async (req, res) => {
  try {
    const matchId = req.params.id;
    const matches = await query('SELECT * FROM matches WHERE id = ?', [matchId]);
    const match = matches[0];

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchUpdate = await runMatch(matchId);
    res.json(matchUpdate);
  } catch (error) {
    console.error('Error starting match:', error);
    res.status(500).json({ error: 'Failed to start match' });
  }
});

apiRouter.post('/match/start-all', async (req, res) => {
  try {
    const matches = await query("SELECT * FROM matches WHERE status = 'pending' LIMIT 10");
    const results = [];
    for (const match of matches) {
      if (match.agent1_id && match.agent2_id) {
        const result = await runMatch(match.id);
        results.push(result);
      }
    }
    res.json({ started: results.length, matches: results });
  } catch (error) {
    console.error('Error starting matches:', error);
    res.status(500).json({ error: 'Failed to start matches' });
  }
});

apiRouter.get('/match/:id', async (req, res) => {
  try {
    const matches = await query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    const match = matches[0];

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

apiRouter.get('/matches/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const matches = await query(`SELECT * FROM matches ORDER BY created_at DESC LIMIT ${limit}`);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

apiRouter.get('/matches/live', async (req, res) => {
  try {
    const matches = await query("SELECT * FROM matches WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 20");
    res.json(matches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ error: 'Failed to fetch live matches' });
  }
});

async function getAgentById(agentId) {
  const agents = await query('SELECT * FROM agents WHERE id = ?', [agentId]);
  return agents[0];
}

async function updateMatchStatus(matchId, status, additionalFields = {}) {
  const now = Date.now();
  const updates = ['status = ?', 'updated_at = ?'];
  const args = [status, now, matchId];
  
  for (const [key, value] of Object.entries(additionalFields)) {
    updates.push(`${key} = ?`);
    args.unshift(value);
  }
  
  args.push(matchId);
  await run(`UPDATE matches SET ${updates.join(', ')} WHERE id = ?`, args);
}

async function updateAgentElo(agentId, elo, matchesPlayed, wins, losses, highScore, averageScore) {
  const now = Date.now();
  await run(
    `UPDATE agents SET elo = ?, matches_played = ?, wins = ?, losses = ?, high_score = ?, average_score = ?, updated_at = ? WHERE id = ?`,
    [elo, matchesPlayed, wins, losses, highScore, averageScore, now, agentId]
  );
}

async function runMatch(matchId) {
  const matches = await query('SELECT * FROM matches WHERE id = ?', [matchId]);
  const match = matches[0];

  if (!match || !match.agent1_id || !match.agent2_id) {
    throw new Error('Invalid match');
  }

  const agent1 = await getAgentById(match.agent1_id);
  const agent2 = await getAgentById(match.agent2_id);

  if (!agent1 || !agent2) {
    throw new Error('Agent not found');
  }

  await updateMatchStatus(matchId, 'in_progress');

  const engine1 = new BowlingEngine();
  const engine2 = new BowlingEngine();
  const frames1 = [];
  const frames2 = [];

  for (let frame = 1; frame <= 10; frame++) {
    const throw1 = generateBotThrow(agent1.id, frame, 1);
    const result1 = engine1.simulateThrow(throw1);
    engine1.recordRoll(result1.pinsDown, frames1);

    if (result1.pinsDown.length < 10) {
      const throw1b = generateBotThrow(agent1.id, frame, 2);
      const result1b = engine1.simulateThrow(throw1b);
      engine1.recordRoll(result1b.pinsDown, frames1);
    }

    const throw2 = generateBotThrow(agent2.id, frame, 1);
    const result2 = engine2.simulateThrow(throw2);
    engine2.recordRoll(result2.pinsDown, frames2);

    if (result2.pinsDown.length < 10) {
      const throw2b = generateBotThrow(agent2.id, frame, 2);
      const result2b = engine2.simulateThrow(throw2b);
      engine2.recordRoll(result2b.pinsDown, frames2);
    }
  }

  const score1 = engine1.getFinalScore();
  const score2 = engine2.getFinalScore();

  const { agent1NewElo, agent2NewElo, eloChanges } = calculateNewElos(
    score1, score2, agent1.elo, agent2.elo
  );

  const winnerId = score1 > score2 ? agent1.id : score2 > score1 ? agent2.id : null;

  const newAvg1 = ((agent1.average_score * agent1.matches_played) + score1) / (agent1.matches_played + 1);
  const newAvg2 = ((agent2.average_score * agent2.matches_played) + score2) / (agent2.matches_played + 1);

  await updateMatchStatus(matchId, 'completed', {
    agent1_score: score1,
    agent2_score: score2,
    agent1_frames: JSON.stringify(frames1),
    agent2_frames: JSON.stringify(frames2),
    replay_data: JSON.stringify({
      agent1: engine1.getReplayData(),
      agent2: engine2.getReplayData(),
    }),
    winner_id: winnerId,
    completed_at: Date.now(),
  });

  await updateAgentElo(
    agent1.id,
    agent1NewElo,
    agent1.matches_played + 1,
    winnerId === agent1.id ? agent1.wins + 1 : agent1.wins,
    winnerId === agent2.id ? agent1.losses + 1 : agent1.losses,
    Math.max(agent1.high_score, score1),
    newAvg1
  );

  await updateAgentElo(
    agent2.id,
    agent2NewElo,
    agent2.matches_played + 1,
    winnerId === agent2.id ? agent2.wins + 1 : agent2.wins,
    winnerId === agent1.id ? agent2.losses + 1 : agent2.losses,
    Math.max(agent2.high_score, score2),
    newAvg2
  );

  return {
    id: matchId,
    status: 'completed',
    agent1Score: score1,
    agent2Score: score2,
    winnerId,
    eloChanges: {
      [agent1.id]: eloChanges[0],
      [agent2.id]: eloChanges[1],
    },
  };
}
