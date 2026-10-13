import React, { useState } from 'react';
import type { SimulationResult } from '@relayrooms/core';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SimulationResult;
  parentScore?: number;
  parentJointStep?: number;
  currentRunId?: number;
  onPublish: () => Promise<number | undefined>;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  result,
  parentJointStep,
  currentRunId,
  onPublish,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRunId, setPublishedRunId] = useState<number | null>(currentRunId ?? null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentJoint = result.jointFinishingStep;
  const isBetter = parentJointStep ? currentJoint < parentJointStep : true;
  const isTie = parentJointStep ? currentJoint === parentJointStep : false;
  const delta = parentJointStep ? parentJointStep - currentJoint : 0;

  const handlePublishClick = async () => {
    setIsPublishing(true);
    try {
      const newId = await onPublish();
      if (newId) {
        setPublishedRunId(newId);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const shareableUrl = `${window.location.origin}/#run=${publishedRunId || 1}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          border: '1px solid var(--border-highlight)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Room Cleared!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Both characters collected their objectives and escaped.
          </p>
        </div>

        {/* Comparison Card */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Joint Escape Step:</span>
            <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              Step {currentJoint}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Individual Times:</span>
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--color-char-a)' }}>A: {result.finishStepA}s</span>
              {' | '}
              <span style={{ color: 'var(--color-char-b)' }}>B: {result.finishStepB}s</span>
            </span>
          </div>

          {parentJointStep !== undefined && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Comparison vs Parent:</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isBetter ? '#22c55e' : isTie ? '#eab308' : '#ef4444',
                }}
              >
                {isBetter && delta > 0 ? `🚀 ${delta} Steps Faster!` : isTie ? '⚖️ Equal Result' : `⚠️ ${-delta} Steps Slower`}
              </span>
            </div>
          )}
        </div>

        {/* Publication & Share Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {publishedRunId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Your playable reply is verified! Share this link with your friend:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="shareable-link-input"
                  type="text"
                  readOnly
                  value={shareableUrl}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  id="btn-copy-share-link"
                  className="btn-primary"
                  onClick={handleCopyLink}
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <button
              id="btn-publish-reply"
              className="btn-primary"
              onClick={handlePublishClick}
              disabled={isPublishing}
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            >
              {isPublishing ? 'Verifying on Monad...' : '🔗 Publish Playable Reply to Monad'}
            </button>
          )}

          <button
            id="btn-close-modal"
            className="btn-secondary"
            onClick={onClose}
            style={{ width: '100%', padding: '10px' }}
          >
            Review Simulation & Practice
          </button>
        </div>
      </div>
    </div>
  );
};
