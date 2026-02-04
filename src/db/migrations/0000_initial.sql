import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  twitterHandle: text('twitter_handle'),
  elo: integer('elo').notNull().default(1200),
  matchesPlayed: integer('matches_played').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  highScore: integer('high_score').notNull().default(0),
  averageScore: real('average_score').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
  agent1Id: text('agent1_id').references(() => agents.id),
  agent2Id: text('agent2_id').references(() => agents.id),
  winnerId: text('winner_id').references(() => agents.id),
  agent1Score: integer('agent1_score').notNull().default(0),
  agent2Score: integer('agent2_score').notNull().default(0),
  agent1Frames: text('agent1_frames').notNull(),
  agent2Frames: text('agent2_frames').notNull(),
  replayData: text('replay_data').notNull(),
  spectators: integer('spectators').notNull().default(0),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const matchQueue = sqliteTable('match_queue', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  status: text('status', { enum: ['waiting', 'matched', 'expired'] }).notNull().default('waiting'),
  preferredEloRange: integer('preferred_elo_range').notNull().default(100),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const agentsRelations = relations(agents, ({ many }) => ({
  matchesAsAgent1: many(matches, { relationName: 'agent1_matches' }),
  matchesAsAgent2: many(matches, { relationName: 'agent2_matches' }),
  queueEntries: many(matchQueue),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  agent1: one(agents, {
    fields: [matches.agent1Id],
    references: [agents.id],
    relationName: 'agent1_matches',
  }),
  agent2: one(agents, {
    fields: [matches.agent2Id],
    references: [agents.id],
    relationName: 'agent2_matches',
  }),
  winner: one(agents, {
    fields: [matches.winnerId],
    references: [agents.id],
  }),
}));
