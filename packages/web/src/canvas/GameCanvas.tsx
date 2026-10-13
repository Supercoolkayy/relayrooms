import React, { useEffect, useRef } from 'react';
import {
  type RoomDefinition,
  type StepState,
  BOARD_SIZE,
} from '@relayrooms/core';

interface GameCanvasProps {
  room: RoomDefinition;
  currentState: StepState;
  activeRole: 0 | 1; // 0 for controlling A, 1 for controlling B
  historyStates: StepState[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  room,
  currentState,
  activeRole,
  historyStates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 64;
    const width = BOARD_SIZE * cellSize;
    const height = BOARD_SIZE * cellSize;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 1. Draw Background Grid
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = y * BOARD_SIZE + x;
        const px = x * cellSize;
        const py = y * cellSize;

        if (room.walls[cell]) {
          // Wall tile
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, cellSize, cellSize);

          // Wall bevel
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Grid pattern inside wall
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        } else {
          // Floor tile
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px, py, cellSize, cellSize);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }
    }

    // 2. Draw Pressure Plates
    for (let i = 0; i < room.links.length; i++) {
      const link = room.links[i];
      const px = (link.plateCell % BOARD_SIZE) * cellSize;
      const py = Math.floor(link.plateCell / BOARD_SIZE) * cellSize;
      const isPressed = currentState.pressedPlates[i];

      ctx.save();
      ctx.translate(px + cellSize / 2, py + cellSize / 2);

      // Plate base
      ctx.fillStyle = isPressed ? '#854d0e' : '#292524';
      ctx.strokeStyle = isPressed ? '#facc15' : '#78716c';
      ctx.lineWidth = isPressed ? 3 : 2;

      ctx.beginPath();
      ctx.roundRect(-22, -22, 44, 44, 8);
      ctx.fill();
      ctx.stroke();

      if (isPressed) {
        // Glowing activation ripple
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Inactive center
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw Doors
    for (let i = 0; i < room.links.length; i++) {
      const link = room.links[i];
      const px = (link.doorCell % BOARD_SIZE) * cellSize;
      const py = Math.floor(link.doorCell / BOARD_SIZE) * cellSize;
      const isOpen = currentState.openDoors[i];

      ctx.save();
      if (isOpen) {
        // Open door: green doorway outline with dashed passage
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(px + 4, py + 4, cellSize - 8, cellSize - 8);

        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);

        // Indicator dot
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px + cellSize / 2, py + cellSize / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Closed door: solid barrier with hazard stripes
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

        // Laser grill bars
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        for (let l = 12; l < cellSize - 10; l += 10) {
          ctx.beginPath();
          ctx.moveTo(px + 8, py + l);
          ctx.lineTo(px + cellSize - 8, py + l);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 4. Draw Objectives (Gems/Keys)
    const drawObjective = (cell: number, hasCollected: boolean, color: string) => {
      if (hasCollected) return; // already picked up
      const px = (cell % BOARD_SIZE) * cellSize + cellSize / 2;
      const py = Math.floor(cell / BOARD_SIZE) * cellSize + cellSize / 2;

      ctx.save();
      ctx.translate(px, py);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;

      // Rotating diamond
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();

      // Inner shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawObjective(room.objectiveA, currentState.charA.hasObjective, '#06b6d4');
    drawObjective(room.objectiveB, currentState.charB.hasObjective, '#f43f5e');

    // 5. Draw Exits (Portals)
    const drawExit = (cell: number, isUnlocked: boolean, color: string, label: string) => {
      const px = (cell % BOARD_SIZE) * cellSize + cellSize / 2;
      const py = Math.floor(cell / BOARD_SIZE) * cellSize + cellSize / 2;

      ctx.save();
      ctx.translate(px, py);

      // Outer portal ring
      ctx.strokeStyle = isUnlocked ? color : '#475569';
      ctx.lineWidth = isUnlocked ? 3 : 2;
      if (isUnlocked) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      }

      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();

      // Inner portal swirl
      ctx.fillStyle = isUnlocked ? `${color}33` : '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Text label
      ctx.font = 'bold 10px "Space Mono", monospace';
      ctx.fillStyle = isUnlocked ? '#ffffff' : '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0);

      ctx.restore();
    };

    drawExit(room.exitA, currentState.charA.hasObjective, '#06b6d4', 'EXIT A');
    drawExit(room.exitB, currentState.charB.hasObjective, '#f43f5e', 'EXIT B');

    // 6. Draw Ghost Trail for the non-active role
    const ghostTrailRole = activeRole === 0 ? 1 : 0;
    if (historyStates.length > 1) {
      ctx.save();
      ctx.strokeStyle = ghostTrailRole === 0 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      for (let s = 0; s < historyStates.length; s++) {
        const char = ghostTrailRole === 0 ? historyStates[s].charA : historyStates[s].charB;
        const tx = (char.cell % BOARD_SIZE) * cellSize + cellSize / 2;
        const ty = Math.floor(char.cell / BOARD_SIZE) * cellSize + cellSize / 2;
        if (s === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 7. Draw Characters
    const areOverlapping = currentState.charA.cell === currentState.charB.cell;

    const drawCharacter = (
      charState: typeof currentState.charA,
      role: 0 | 1,
      offsetX: number,
      offsetY: number
    ) => {
      const isControlled = activeRole === role;
      const color = role === 0 ? '#06b6d4' : '#f43f5e';
      const label = role === 0 ? 'A' : 'B';

      const px = (charState.cell % BOARD_SIZE) * cellSize + cellSize / 2 + offsetX;
      const py = Math.floor(charState.cell / BOARD_SIZE) * cellSize + cellSize / 2 + offsetY;

      ctx.save();
      ctx.translate(px, py);

      // Ghost opacity if not controlled
      if (!isControlled) {
        ctx.globalAlpha = 0.7;
      }

      // Aura if carrying objective
      if (charState.hasObjective) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }

      // Character body circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isControlled ? 2.5 : 1.5;
      if (!isControlled) {
        ctx.setLineDash([3, 3]);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Role letter
      ctx.fillStyle = '#080c14';
      ctx.font = 'bold 13px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 1);

      // Finished badge
      if (charState.finished) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(10, -10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    };

    const offsetA = areOverlapping ? -8 : 0;
    const offsetB = areOverlapping ? 8 : 0;

    // Draw ghost first, then active player on top
    if (activeRole === 0) {
      drawCharacter(currentState.charB, 1, offsetB, offsetB);
      drawCharacter(currentState.charA, 0, offsetA, offsetA);
    } else {
      drawCharacter(currentState.charA, 0, offsetA, offsetA);
      drawCharacter(currentState.charB, 1, offsetB, offsetB);
    }
  }, [room, currentState, activeRole, historyStates]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        id="relayrooms-canvas"
        ref={canvasRef}
        style={{
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      />
    </div>
  );
};
