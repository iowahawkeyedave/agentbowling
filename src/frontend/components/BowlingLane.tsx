import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Pin {
  id: number;
  x: number;
  y: number;
  standing: boolean;
  rotation: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  rotation: number;
}

interface BowlingLaneProps {
  currentRoll?: number;
  pinsDown?: number[];
  ballPosition?: { x: number; y: number };
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
}

const PIN_POSITIONS = [
  { x: 400, y: 80 },   // Head pin (1)
  { x: 370, y: 130 },  // 2
  { x: 430, y: 130 },  // 3
  { x: 340, y: 180 },  // 4
  { x: 400, y: 180 },  // 5
  { x: 460, y: 180 },  // 6
  { x: 310, y: 230 },  // 7
  { x: 370, y: 230 },  // 8
  { x: 430, y: 230 },  // 9
  { x: 490, y: 230 },  // 10
];

export const BowlingLane: React.FC<BowlingLaneProps> = ({
  currentRoll = 1,
  pinsDown = [],
  ballPosition = { x: 400, y: 500 },
  isAnimating = false,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ball, setBall] = useState<Ball>({ x: ballPosition.x, y: ballPosition.y, radius: 20, rotation: 0 });
  const [pins, setPins] = useState<Pin[]>(() => 
    PIN_POSITIONS.map((pos, index) => ({
      id: index,
      x: pos.x,
      y: pos.y,
      standing: !pinsDown.includes(index),
      rotation: 0,
    }))
  );

  useEffect(() => {
    setPins(PIN_POSITIONS.map((pos, index) => ({
      id: index,
      x: pos.x,
      y: pos.y,
      standing: !pinsDown.includes(index),
      rotation: 0,
    })));
  }, [pinsDown]);

  useEffect(() => {
    if (!isAnimating) return;

    let animationId: number;
    let direction = ball.x < 400 ? 1 : -1;
    
    const animate = () => {
      setBall(prev => {
        const newY = prev.y - 8;
        const newX = prev.x + direction * 0.5;
        const newRotation = prev.rotation + 0.2;

        if (newY <= 150) {
          direction *= 1.05;
          
          pins.forEach((pin, index) => {
            if (pin.standing) {
              const dist = Math.sqrt((newX - pin.x) ** 2 + (150 - pin.y) ** 2);
              if (dist < 35) {
                setPins(p => p.map(pi => 
                  pi.id === index 
                    ? { ...pi, standing: false, rotation: (Math.random() - 0.5) * 30 }
                    : pi
                ));
              }
            }
          });
        }

        if (newY < 50) {
          onAnimationComplete?.();
          return prev;
        }

        return { ...prev, y: newY, x: newX, rotation: newRotation };
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isAnimating, onAnimationComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, 800, 600);

      // Draw lane
      const laneGradient = ctx.createLinearGradient(0, 100, 0, 600);
      laneGradient.addColorStop(0, '#d4a574');
      laneGradient.addColorStop(1, '#b88460');
      ctx.fillStyle = laneGradient;
      ctx.fillRect(150, 50, 500, 550);

      // Lane borders
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(150, 50);
      ctx.lineTo(150, 600);
      ctx.moveTo(650, 50);
      ctx.lineTo(650, 600);
      ctx.stroke();

      // Foul line
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(150, 400);
      ctx.lineTo(650, 400);
      ctx.stroke();

      // Gutters
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(140, 50, 10, 550);
      ctx.fillRect(650, 50, 10, 550);

      // Draw pins
      pins.forEach(pin => {
        if (pin.standing) {
          // Pin body
          ctx.save();
          ctx.translate(pin.x, pin.y);
          
          ctx.fillStyle = '#fefefe';
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.quadraticCurveTo(12, -15, 12, 0);
          ctx.quadraticCurveTo(12, 15, 0, 20);
          ctx.quadraticCurveTo(-12, 15, -12, 0);
          ctx.quadraticCurveTo(-12, -15, 0, -20);
          ctx.fill();

          // Red stripes
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-8, -10);
          ctx.lineTo(8, -10);
          ctx.moveTo(-10, -5);
          ctx.lineTo(10, -5);
          ctx.stroke();

          // Pin neck
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.arc(0, -12, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else {
          // Fallen pin
          ctx.save();
          ctx.translate(pin.x + pin.rotation * 2, pin.y + 15);
          ctx.rotate((pin.rotation * Math.PI) / 180);
          
          ctx.fillStyle = '#fefefe';
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-5, -3);
          ctx.lineTo(5, -3);
          ctx.stroke();

          ctx.restore();
        }
      });

      // Draw ball
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.rotation);

      // Ball body
      const ballGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, ball.radius);
      ballGradient.addColorStop(0, '#4a4a4a');
      ballGradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ball holes
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(-7, -7, 4, 0, Math.PI * 2);
      ctx.arc(7, -7, 4, 0, Math.PI * 2);
      ctx.arc(0, 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Ball shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(-8, -8, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Arrow indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(ball.x, 480);
      ctx.lineTo(ball.x - 15, 520);
      ctx.lineTo(ball.x + 15, 520);
      ctx.closePath();
      ctx.fill();
    };

    draw();
  }, [ball, pins]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="rounded-lg shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};

export default BowlingLane;
