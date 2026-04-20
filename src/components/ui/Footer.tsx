import { useEffect, useState } from 'react';
import { Button } from './primitives/Button';
import { takeScreenshot } from '../../lib/screenshot';
import { exportConfig } from '../../lib/exportConfig';
import { useConfigStore } from '../../store/configStore';
import { tokens } from '../../styles/tokens';
import { audioState } from '../../lib/audio';

export function Footer() {
  const config        = useConfigStore((s) => s.config);
  const bumpResetTick = useConfigStore((s) => s.bumpResetTick);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { const unsub = audioState.subscribe((m) => setMuted(m)); return () => { unsub(); }; }, []);

  const border = `1px solid ${hovered ? tokens.color.borderAccent : tokens.color.borderSubtle}`;

  const handleExport = async () => {
    await exportConfig(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Reset View — bottom-left, clear of the type selector */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          zIndex: 10,
          animation: 'cc-rise 0.8s ease 2.6s both',
          display: 'flex',
          gap: 8,
        }}
      >
        <Button label="Reset View" variant="secondary" onClick={bumpResetTick} />
        <button
          onClick={() => { audioState.toggle(); }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{
            background: 'transparent',
            border,
            borderRadius: tokens.radius.sharp,
            padding: '10px',
            cursor: 'pointer',
            color: muted ? tokens.color.textMuted : tokens.color.textPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Export + Screenshot — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 10,
          animation: 'cc-rise 0.8s ease 2.6s both',
        }}
      >
        {copied && (
          <span
            style={{
              fontFamily: tokens.font.mono,
              fontSize: 11,
              color: tokens.color.borderAccentBright,
              letterSpacing: '0.05em',
            }}
          >
            Configuration copied
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button label="Export" variant="secondary" onClick={handleExport} />
          <Button label="Screenshot" onClick={takeScreenshot} />
        </div>
      </div>
    </>
  );
}
