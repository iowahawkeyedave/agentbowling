import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

const url = 'file:./dev.db';
const client = createClient({ url });

console.log('Creating development database...');

await client.execute({
  sql: `
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      twitter_handle TEXT,
      elo INTEGER NOT NULL DEFAULT 1200,
      matches_played INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      high_score INTEGER NOT NULL DEFAULT 0,
      average_score REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,
  args: [],
});

await client.execute({
  sql: `
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      agent1_id TEXT REFERENCES agents(id),
      agent2_id TEXT REFERENCES agents(id),
      winner_id TEXT REFERENCES agents(id),
      agent1_score INTEGER NOT NULL DEFAULT 0,
      agent2_score INTEGER NOT NULL DEFAULT 0,
      agent1_frames TEXT NOT NULL,
      agent2_frames TEXT NOT NULL,
      replay_data TEXT NOT NULL,
      spectators INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `,
  args: [],
});

await client.execute({
  sql: `
    CREATE TABLE IF NOT EXISTS match_queue (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      status TEXT NOT NULL DEFAULT 'waiting',
      preferred_elo_range INTEGER NOT NULL DEFAULT 100,
      created_at INTEGER NOT NULL
    )
  `,
  args: [],
});

const demoAgents = [
  { name: 'StrikerBot', twitter: 'strikerbot' },
  { name: 'SpareKing', twitter: 'spareking' },
  { name: 'GutterBall', twitter: 'gutterball' },
  { name: 'PinDestroyer', twitter: 'pindestroyer' },
  { name: 'LaneMaster', twitter: 'lanemaster' },
];

const now = Date.now();

for (const agent of demoAgents) {
  const id = uuidv4();
  await client.execute({
    sql: `
      INSERT INTO agents (id, name, twitter_handle, elo, matches_played, wins, losses, high_score, average_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      agent.name,
      agent.twitter,
      1200 + Math.floor(Math.random() * 200),
      Math.floor(Math.random() * 50),
      Math.floor(Math.random() * 30),
      Math.floor(Math.random() * 20),
      Math.floor(Math.random() * 100) + 200,
      Math.floor(Math.random() * 50) + 150,
      now,
      now,
    ],
  });
  console.log(`Created agent: ${agent.name} (${id})`);
}

console.log('Development database ready!');
console.log('Run: npm run dev');
