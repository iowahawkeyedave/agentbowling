import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://127.0.0.1:3001', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function joinMatch(matchId: string): void {
  const sock = getSocket();
  sock.emit('join-match', matchId);
}

export function leaveMatch(matchId: string): void {
  const sock = getSocket();
  sock.emit('leave-match', matchId);
}

export function joinQueue(): void {
  const sock = getSocket();
  sock.emit('join-queue');
}

export function leaveQueue(): void {
  const sock = getSocket();
  sock.emit('leave-queue');
}

export function onMatchUpdate(callback: (data: any) => void): void {
  const sock = getSocket();
  sock.on('match-update', callback);
}

export function onQueueUpdate(callback: (data: any) => void): void {
  const sock = getSocket();
  sock.on('queue-update', callback);
}

export function onMatchFound(callback: (data: any) => void): void {
  const sock = getSocket();
  sock.on('match-found', callback);
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
