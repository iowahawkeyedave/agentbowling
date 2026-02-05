import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BowlingLane } from './BowlingLane';

interface MatchViewerProps {
    matchId: string;
    initialMatchData?: any;
}

interface MatchData {
    id: string;
    status: string;
    agent1_id: string;
    agent2_id: string;
    agent1_score: number;
    agent2_score: number;
    agent1_frames: string;
    agent2_frames: string;
    replay_data: string;
    spectators: number;
    winner_id: string | null;
}

interface Agent {
    id: string;
    name: string;
    elo: number;
}

export const MatchViewer: React.FC<MatchViewerProps> = ({ matchId, initialMatchData }) => {
    const [match, setMatch] = useState<MatchData | null>(initialMatchData || null);
    const [agents, setAgents] = useState<{ [key: string]: Agent }>({});
    const [socket, setSocket] = useState<Socket | null>(null);
    const [replayQueue, setReplayQueue] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentLaneState, setCurrentLaneState] = useState({
        ballPosition: { x: 400, y: 500 },
        pinsDown: [] as number[],
        currentRoll: 1,
    });

    // Fetch agents on mount
    useEffect(() => {
        fetch('/api/agents')
            .then(res => res.json())
            .then(data => {
                const agentMap: { [key: string]: Agent } = {};
                data.forEach((a: Agent) => agentMap[a.id] = a);
                setAgents(agentMap);
            })
            .catch(console.error);

        if (!initialMatchData) {
            fetch(`/api/match/${matchId}`)
                .then(res => res.json())
                .then(setMatch)
                .catch(console.error);
        }
    }, [matchId, initialMatchData]);

    // Socket connection
    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);

        newSocket.emit('join-match', matchId);

        newSocket.on('match-update', (data: MatchData) => {
            setMatch(data);

            // If there's replay data, add it to the queue
            try {
                const replay = JSON.parse(data.replay_data);
                if (replay && (replay.agent1?.length > 0 || replay.agent2?.length > 0)) {
                    // This is a simplification. The backend sends the WHOLE replay history in replay_data JSON string.
                    // In a real optimized app we'd send delta updates.
                    // For now, let's just trigger animation if status changed to completed or if we want to visualize live.
                    // Actually, the backend sends the full replay at the end. 
                    // If we want LIVE updates, we'd need the backend to emit specific 'roll' events.
                    // Looking at backend code: it only emits 'match-update' inside runMatch, calling updateMatchStatus each time?
                    // No, runMatch runs the WHOLE match efficiently then saves.
                    // Wait, let's re-read backend.

                    // It calls updateMatchStatus(matchId, 'in_progress')
                    // Then it calls runMatch which loops 1 to 10 frames...
                    // BUT it does NOT emit updates per frame using broadcastMatchUpdate!
                    // It only returns the result at the end of runMatch.
                    // AND it saves to DB at the end.

                    // Ah, I missed something in the backend analysis. 
                    // `runMatch` does `await updateMatchStatus` at the END. 
                    // So the client only sees 'in_progress' then 'completed' with all data.
                    // So "Live" is a bit of a lie unless we change the backend or simulate "live" playback on client.

                    // Let's implement the "Playback" on client side using the replay data when match completes.
                }
            } catch (e) {
                console.error("Error parsing replay data", e);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [matchId]);

    // Handle Replay Playback
    useEffect(() => {
        if (match?.status === 'completed' && !isAnimating) {
            try {
                const replay = JSON.parse(match.replay_data);
                // Combine agent 1 and 2 replays properly? 
                // The backend `getReplayData` returns array of ReplayFrame.
                // We can just animate them.
                // For now, let's just show the final state or simple animation.
                // Let's just set the final state.
                setIsAnimating(true);

                // Mock animation sequence for now since the replay structure is complex to parse fast
                setTimeout(() => setIsAnimating(false), 2000);
            } catch (e) { }
        }
    }, [match]);

    const agent1 = match ? agents[match.agent1_id] : null;
    const agent2 = match ? agents[match.agent2_id] : null;

    const parseFrames = (framesStr: string) => {
        try {
            return JSON.parse(framesStr);
        } catch {
            return [];
        }
    };

    const frames1 = match ? parseFrames(match.agent1_frames) : [];
    const frames2 = match ? parseFrames(match.agent2_frames) : [];

    const total1 = frames1.reduce((sum: number, frame: number[]) => sum + (frame[0] || 0), 0);
    const total2 = frames2.reduce((sum: number, frame: number[]) => sum + (frame[0] || 0), 0);

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <div className="bg-gray-800 rounded-xl p-4 min-h-[500px] flex items-center justify-center">
                    {/* We pass props to BowlingLane. For now simple defaults or animation trigger */}
                    <BowlingLane
                        isAnimating={isAnimating}
                        onAnimationComplete={() => setIsAnimating(false)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-xl font-bold text-white mb-4">Scoreboard</h2>
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                            <div className="text-3xl font-bold text-blue-400">{match?.agent1_score || 0}</div>
                            <div className="text-gray-400 text-sm">{agent1?.name || 'Loading...'}</div>
                        </div>
                        <div className="text-gray-500 flex items-center justify-center">
                            <span className="text-xl">VS</span>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-400">{match?.agent2_score || 0}</div>
                            <div className="text-gray-400 text-sm">{agent2?.name || 'Loading...'}</div>
                        </div>
                    </div>
                    <div className="text-center text-yellow-400 font-medium">
                        {match?.status === 'completed' ? 'Final Score' : 'In Progress'}
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-xl font-bold text-white mb-4">Frame Results</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>{agent1?.name || 'Agent 1'}</span>
                            <span>{total1}</span>
                        </div>
                        {frames1.map((frame: number[], i: number) => (
                            <div key={`p1-f${i}`} className="flex justify-between items-center py-1 border-b border-gray-700">
                                <span className="text-gray-500 text-sm">F{i + 1}</span>
                                <div className="flex gap-1">
                                    {frame.map((score: number, j: number) => (
                                        <span key={j} className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-xs text-white">
                                            {score}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="mt-4 border-t border-gray-700 pt-2">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>{agent2?.name || 'Agent 2'}</span>
                                <span>{total2}</span>
                            </div>
                            {frames2.map((frame: number[], i: number) => (
                                <div key={`p2-f${i}`} className="flex justify-between items-center py-1 border-b border-gray-700">
                                    <span className="text-gray-500 text-sm">F{i + 1}</span>
                                    <div className="flex gap-1">
                                        {frame.map((score: number, j: number) => (
                                            <span key={j} className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-xs text-white">
                                                {score}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-xl font-bold text-white mb-4">Spectators</h2>
                    <div className="flex items-center gap-2 text-green-400">
                        <span className="text-2xl">👁️</span>
                        <span>{match?.spectators || 0}</span>
                        <span className="text-gray-400">watching</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
