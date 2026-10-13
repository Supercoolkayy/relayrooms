import React from 'react';
import { type RoomDefinition, ROOMS } from '@relayrooms/core';

interface HeaderProps {
  currentRoom: RoomDefinition;
  onSelectRoom: (room: RoomDefinition) => void;
  walletAddress?: string;
  onConnectWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoom,
  onSelectRoom,
  walletAddress,
  onConnectWallet,
}) => {
  return (
    <header
      className="glass-panel"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        margin: '16px auto',
        maxWidth: '960px',
        width: 'calc(100% - 32px)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #f43f5e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
          }}
        >
          ⇄
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Relay Rooms
          </h1>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            PLAYABLE REPLIES • MONAD
          </div>
        </div>
      </div>

      {/* Room Selector & Par Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <select
          id="room-selector"
          value={currentRoom.id}
          onChange={(e) => {
            const rId = parseInt(e.target.value, 10);
            const r = ROOMS.find((rm) => rm.id === rId);
            if (r) onSelectRoom(r);
          }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            color: 'var(--text-main)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          {ROOMS.map((r) => (
            <option key={r.id} value={r.id}>
              Room {r.id}: {r.name}
            </option>
          ))}
        </select>

        {/* Wallet / Network Status */}
        {walletAddress ? (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid #22c55e',
              color: '#22c55e',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ● {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        ) : (
          <button
            id="btn-connect-wallet"
            className="btn-secondary"
            onClick={onConnectWallet}
            style={{ fontSize: '13px' }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
};
