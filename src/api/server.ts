import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { apiRouter } from './routes/index.js';

const app = express();
const httpServer = createServer(app);

const CORS_ORIGIN = process.env.FRONTEND_URL || '*';

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

import { matchmakingService } from './services/matchmaking.js';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use('/api', apiRouter);

// Register matchmaking events
matchmakingService.on('match-found', (data: any) => {
  console.log('Server: Match found event received from service. MatchID:', data.matchId);
  console.log('Server: Broadcasting to queue-room');
  io.to('queue-room').emit('match-found', data);
});

matchmakingService.on('queue-update', (data: any) => {
  io.to('queue-room').emit('queue-update', data);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-match', (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`Client ${socket.id} joined match:${matchId}`);
  });

  socket.on('leave-match', (matchId: string) => {
    socket.leave(`match:${matchId}`);
    console.log(`Client ${socket.id} left match:${matchId}`);
  });

  socket.on('join-queue', () => {
    socket.join('queue-room');
    console.log(`Client ${socket.id} joined queue room`);
  });

  socket.on('leave-queue', () => {
    socket.leave('queue-room');
    console.log(`Client ${socket.id} left queue room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export function broadcastMatchUpdate(matchId: string, data: any) {
  io.to(`match:${matchId}`).emit('match-update', data);
}

export function broadcastQueueUpdate(data: any) {
  io.to('queue-room').emit('queue-update', data);
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
  });
}

export default app;
