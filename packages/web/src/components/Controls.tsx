import React from 'react';
import { Action } from '@relayrooms/core';

interface ControlsProps {
  currentStep: number;
  totalSteps: number;
  maxRecordedSteps: number;
  isPlaying: boolean;
  activeRole: 0 | 1;
  onStepChange: (step: number) => void;
  onPlayToggle: () => void;
  onRecordAction: (action: Action) => void;
  onUndo: () => void;
  onReset: () => void;
  onSwitchRole: (role: 0 | 1) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentStep,
  maxRecordedSteps,
  isPlaying,
  activeRole,
  onStepChange,
  onPlayToggle,
  onRecordAction,
  onUndo,
  onReset,
  onSwitchRole,
}) => {
  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        maxWidth: '540px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* 1. Role Selector & Status Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Player:
          </span>
          <button
            id="role-select-a"
            className={`btn-secondary btn-role-a ${activeRole === 0 ? 'active' : ''}`}
            onClick={() => onSwitchRole(0)}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            ● Character A
          </button>
          <button
            id="role-select-b"
            className={`btn-secondary btn-role-b ${activeRole === 1 ? 'active' : ''}`}
            onClick={() => onSwitchRole(1)}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            ● Character B
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            Step {currentStep} / {maxRecordedSteps}
          </span>
        </div>
      </div>

      {/* 2. Timeline Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <input
          id="playback-timeline-slider"
          type="range"
          min={0}
          max={Math.max(1, maxRecordedSteps)}
          value={currentStep}
          onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            accentColor: activeRole === 0 ? 'var(--color-char-a)' : 'var(--color-char-b)',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          <span>Start (0)</span>
          <span>Max Bounded: 24 Steps</span>
        </div>
      </div>

      {/* 3. Playback Controls & Undo/Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="btn-step-start"
            className="btn-secondary"
            onClick={() => onStepChange(0)}
            title="Jump to Start"
          >
            ⏮
          </button>
          <button
            id="btn-step-prev"
            className="btn-secondary"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            title="Step Backward"
          >
            ◀
          </button>
          <button
            id="btn-play-pause"
            className="btn-primary"
            onClick={onPlayToggle}
            style={{ minWidth: '80px' }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            id="btn-step-next"
            className="btn-secondary"
            onClick={() => onStepChange(Math.min(maxRecordedSteps, currentStep + 1))}
            title="Step Forward"
          >
            ▶
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="btn-undo-action"
            className="btn-secondary"
            onClick={onUndo}
            disabled={maxRecordedSteps === 0}
            title="Undo last action"
          >
            ↩ Undo
          </button>
          <button
            id="btn-reset-actions"
            className="btn-secondary"
            onClick={onReset}
            style={{ color: '#ef4444' }}
            title="Reset your recording"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* 4. Touch & Keyboard Direction Pad */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Record Move (Keyboard: WASD / Arrows / Space)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: '6px' }}>
          <div />
          <button
            id="dpad-up"
            className="btn-secondary"
            onClick={() => onRecordAction(Action.UP)}
            style={{ height: '48px', fontSize: '18px', fontWeight: 'bold' }}
          >
            ▲
          </button>
          <div />

          <button
            id="dpad-left"
            className="btn-secondary"
            onClick={() => onRecordAction(Action.LEFT)}
            style={{ height: '48px', fontSize: '18px', fontWeight: 'bold' }}
          >
            ◀
          </button>
          <button
            id="dpad-wait"
            className="btn-secondary"
            onClick={() => onRecordAction(Action.WAIT)}
            style={{ height: '48px', fontSize: '11px', fontWeight: 600, color: 'var(--color-plate)' }}
            title="Wait in place"
          >
            WAIT
          </button>
          <button
            id="dpad-right"
            className="btn-secondary"
            onClick={() => onRecordAction(Action.RIGHT)}
            style={{ height: '48px', fontSize: '18px', fontWeight: 'bold' }}
          >
            ▶
          </button>

          <div />
          <button
            id="dpad-down"
            className="btn-secondary"
            onClick={() => onRecordAction(Action.DOWN)}
            style={{ height: '48px', fontSize: '18px', fontWeight: 'bold' }}
          >
            ▼
          </button>
          <div />
        </div>
      </div>
    </div>
  );
};
