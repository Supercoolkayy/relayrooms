import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ROOM_1,
  ROOMS,
  type RoomDefinition,
  Action,
  simulateRoom,
  MAX_STEPS,
} from '@relayrooms/core';
import { GameCanvas } from './canvas/GameCanvas';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { ComparisonModal } from './components/ComparisonModal';
import { fetchRunFromChain, submitPublishReply } from './web3/client';
import { playMoveSound, playVictorySound } from './audio/sounds';

// Sample pre-recorded run for Character B so newcomers play immediately
const SAMPLE_ACTIONS_B = [
  Action.RIGHT,
  Action.UP,
  Action.UP,
  Action.UP,
  Action.RIGHT,
  Action.UP,
  Action.WAIT,
  Action.WAIT,
  Action.WAIT,
  Action.RIGHT,
  Action.RIGHT,
  Action.RIGHT,
];

export const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<RoomDefinition>(ROOM_1);
  const [activeRole, setActiveRole] = useState<0 | 1>(0); // 0 = Player controls A, 1 = Player controls B
  const [actionsA, setActionsA] = useState<Action[]>([]);
  const [actionsB, setActionsB] = useState<Action[]>(SAMPLE_ACTIONS_B);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [parentRunId, setParentRunId] = useState<number>(1);
  const [parentJointStep, setParentJointStep] = useState<number | undefined>(18);
  const [publishedRunId, setPublishedRunId] = useState<number | undefined>(undefined);
  const [isLoadingRun, setIsLoadingRun] = useState<boolean>(false);

  // 1. Direct onchain URL hydration from hash (#run=1)
  const loadRunFromHash = useCallback(async () => {
    const hash = window.location.hash;
    const match = hash.match(/run=(\d+)/);
    if (!match) return;

    const rId = parseInt(match[1], 10);
    if (isNaN(rId)) return;

    setIsLoadingRun(true);
    const chainData = await fetchRunFromChain(rId);
    setIsLoadingRun(false);

    if (chainData) {
      const roomMatch = ROOMS.find((rm) => rm.id === chainData.run.roomId) || ROOM_1;
      setCurrentRoom(roomMatch);
      setActionsA(chainData.actionsA as Action[]);
      setActionsB(chainData.actionsB as Action[]);
      setParentRunId(rId);
      setParentJointStep(Math.max(chainData.run.finishStepA, chainData.run.finishStepB));
      setPublishedRunId(rId);
      setCurrentStep(0);
      // If loading a friend's run, switch to Role B so you can immediately replace their moves
      setActiveRole(1);
    }
  }, []);

  useEffect(() => {
    loadRunFromHash();
    window.addEventListener('hashchange', loadRunFromHash);
    return () => window.removeEventListener('hashchange', loadRunFromHash);
  }, [loadRunFromHash]);

  // Compute simulation synchronously
  const simulationResult = useMemo(() => {
    return simulateRoom(currentRoom, actionsA, actionsB, MAX_STEPS);
  }, [currentRoom, actionsA, actionsB]);

  const maxRecordedSteps = useMemo(() => {
    return Math.max(actionsA.length, actionsB.length);
  }, [actionsA, actionsB]);

  const currentStepState = useMemo(() => {
    const clamped = Math.min(currentStep, simulationResult.states.length - 1);
    return simulationResult.states[clamped] || simulationResult.states[0];
  }, [currentStep, simulationResult]);

  // Handle victory modal trigger
  useEffect(() => {
    if (simulationResult.completed && currentStep === simulationResult.states.length - 1) {
      setIsModalOpen(true);
      playVictorySound();
    }
  }, [simulationResult.completed, currentStep, simulationResult.states.length]);

  // Playback timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= simulationResult.states.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 300);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, simulationResult.states.length]);

  // Record action
  const handleRecordAction = useCallback(
    (action: Action) => {
      playMoveSound();
      if (activeRole === 0) {
        if (actionsA.length >= MAX_STEPS) return;
        const next = [...actionsA, action];
        setActionsA(next);
        setCurrentStep(Math.max(next.length, actionsB.length));
      } else {
        if (actionsB.length >= MAX_STEPS) return;
        const next = [...actionsB, action];
        setActionsB(next);
        setCurrentStep(Math.max(actionsA.length, next.length));
      }
    },
    [activeRole, actionsA, actionsB]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        handleRecordAction(Action.UP);
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        handleRecordAction(Action.DOWN);
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleRecordAction(Action.LEFT);
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleRecordAction(Action.RIGHT);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleRecordAction(Action.WAIT);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRecordAction, isModalOpen]);

  const handleUndo = () => {
    if (activeRole === 0) {
      if (actionsA.length > 0) {
        const next = actionsA.slice(0, -1);
        setActionsA(next);
        setCurrentStep(Math.max(next.length, actionsB.length));
      }
    } else {
      if (actionsB.length > 0) {
        const next = actionsB.slice(0, -1);
        setActionsB(next);
        setCurrentStep(Math.max(actionsA.length, next.length));
      }
    }
  };

  const handleReset = () => {
    if (activeRole === 0) {
      setActionsA([]);
      setCurrentStep(actionsB.length);
    } else {
      setActionsB([]);
      setCurrentStep(actionsA.length);
    }
    setIsPlaying(false);
  };

  const handleSwitchRole = (newRole: 0 | 1) => {
    setActiveRole(newRole);
  };

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as unknown as { ethereum?: unknown }).ethereum) {
      try {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          return;
        }
      } catch (e) {
        console.warn('Injected wallet request failed:', e);
      }
    }
    // Fallback Anvil wallet
    setWalletAddress('0x5de4...365a');
  };

  const handlePublishReply = async (): Promise<number | undefined> => {
    const chosenActions = activeRole === 0 ? actionsA : actionsB;
    const newId = await submitPublishReply({
      parentRunId,
      roleToReplace: activeRole,
      actions: chosenActions,
    });

    setPublishedRunId(newId);
    setParentJointStep(simulationResult.jointFinishingStep);
    window.location.hash = `run=${newId}`;
    return newId;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '32px' }}>
      <Header
        currentRoom={currentRoom}
        onSelectRoom={(r) => {
          setCurrentRoom(r);
          setActionsA([]);
          setActionsB(SAMPLE_ACTIONS_B);
          setCurrentStep(0);
          setIsModalOpen(false);
          setPublishedRunId(undefined);
          window.location.hash = '';
        }}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
      />

      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          flex: 1,
          padding: '0 16px',
        }}
      >
        {isLoadingRun && (
          <div style={{ fontSize: '13px', color: '#eab308', fontFamily: 'var(--font-mono)' }}>
            ⏳ Hydrating Run #{parentRunId} from Monad RPC...
          </div>
        )}

        {/* Game Canvas */}
        <GameCanvas
          room={currentRoom}
          currentState={currentStepState}
          activeRole={activeRole}
          historyStates={simulationResult.states.slice(0, currentStep + 1)}
        />

        {/* Status Prompt */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: '520px',
            lineHeight: 1.5,
          }}
        >
          {activeRole === 0 ? (
            <span>
              Controlling <strong style={{ color: 'var(--color-char-a)' }}>Character A</strong>.
              Character B is playing recorded ghost moves. Step on plates to clear doors for your partner!
            </span>
          ) : (
            <span>
              Controlling <strong style={{ color: 'var(--color-char-b)' }}>Character B</strong>.
              Character A is playing recorded ghost moves. Find a faster route to beat parent Run #{parentRunId}!
            </span>
          )}
        </div>

        {/* Controls */}
        <Controls
          currentStep={currentStep}
          totalSteps={simulationResult.states.length - 1}
          maxRecordedSteps={maxRecordedSteps}
          isPlaying={isPlaying}
          activeRole={activeRole}
          onStepChange={setCurrentStep}
          onPlayToggle={() => setIsPlaying((p) => !p)}
          onRecordAction={handleRecordAction}
          onUndo={handleUndo}
          onReset={handleReset}
          onSwitchRole={handleSwitchRole}
        />
      </main>

      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={simulationResult}
        parentJointStep={parentJointStep}
        currentRunId={publishedRunId}
        onPublish={handlePublishReply}
      />
    </div>
  );
};

export default App;
