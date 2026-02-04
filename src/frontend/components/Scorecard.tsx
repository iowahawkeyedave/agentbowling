import React from 'react';

interface Frame {
  frameNumber: number;
  rolls: number[];
  score: number;
  isStrike: boolean;
  isSpare: boolean;
}

interface ScorecardProps {
  frames: Frame[];
  currentFrame: number;
  currentRoll: number;
  totalScore: number;
  agentName: string;
  isActive: boolean;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  frames,
  currentFrame,
  currentRoll,
  totalScore,
  agentName,
  isActive,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold ${isActive ? 'text-yellow-400' : 'text-white'}`}>
          {agentName}
        </h3>
        <div className="text-2xl font-bold text-white">{totalScore}</div>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const frame = frames[i] || { rolls: [], isStrike: false, isSpare: false, score: 0 };
          const isCurrentFrame = i + 1 === currentFrame;

          return (
            <div
              key={i}
              className={`flex-1 border border-gray-600 rounded p-1 ${
                isCurrentFrame && isActive ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <div className="text-xs text-gray-500 text-center mb-1">F{i + 1}</div>
              <div className="flex justify-center gap-0.5">
                {frame.rolls.length === 0 ? (
                  <span className="text-gray-600">-</span>
                ) : (
                  frame.rolls.map((roll, j) => (
                    <span
                      key={j}
                      className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${
                        roll === 10
                          ? 'bg-yellow-500 text-black'
                          : roll === 0
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {roll === 10 ? 'X' : roll === 0 ? '-' : roll}
                    </span>
                  ))
                )}
                {!frame.isStrike && !frame.isSpare && frame.rolls.length < 2 && i < 9 && (
                  <span className="w-5 h-5 flex items-center justify-center text-xs text-gray-600">
                    {frame.rolls.length === 0 ? '-' : ''}
                  </span>
                )}
                {frame.isSpare && (
                  <span className="text-xs text-green-400 font-bold">/</span>
                )}
                {frame.isStrike && (
                  <span className="text-xs text-yellow-400 font-bold">X</span>
                )}
              </div>
              <div className="text-xs text-gray-400 text-center mt-1">
                {frame.score > 0 ? frame.score : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scorecard;
