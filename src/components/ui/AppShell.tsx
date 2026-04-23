import { type ReactNode, useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { TypeSelector } from './TypeSelector';
import { ControlPanel } from './ControlPanel';
import { Footer } from './Footer';
import { ViewportFrame } from './ViewportFrame';
import { NoiseOverlay } from './NoiseOverlay';
import { useConfigStore } from '../../store/configStore';
import { makeAudioLayer } from '../../lib/audio';

const TOP_BAND_HEIGHT = 64;
const BRACKET_SIZE = 14;
const BRACKET_GAP = 20;
const DRAWER_WIDTH = 300;
const NARROW_BREAKPOINT = 900;

function useNarrowScreen() {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isNarrow;
}

type BracketProps = { side: 'left' | 'right' };

function Bracket({ side }: BracketProps) {
  const isLeft = side === 'left';
  return (
    <svg
      width={BRACKET_SIZE}
      height={BRACKET_SIZE}
      viewBox="0 0 14 14"
      style={{ transform: isLeft ? 'none' : 'scaleX(-1)', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        d="M 1 1 L 1 13 M 1 1 L 13 1"
        stroke={tokens.color.borderAccent}
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
}

function DrawerToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Close panel' : 'Open panel'}
      style={{
        position: 'absolute',
        top: TOP_BAND_HEIGHT + 12,
        right: 12,
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.color.bgPanel,
        border: `1px solid ${tokens.color.borderAccent}`,
        borderRadius: 2,
        cursor: 'pointer',
        color: tokens.color.textSecondary,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {open ? (
        // × close
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ) : (
        // ≡ menu
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <line x1="0" y1="1"  x2="14" y2="1"  stroke="currentColor" strokeWidth="1.2" />
          <line x1="0" y1="5"  x2="14" y2="5"  stroke="currentColor" strokeWidth="1.2" />
          <line x1="0" y1="9"  x2="14" y2="9"  stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </button>
  );
}

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const archetype = useConfigStore((s) => s.config.archetype);
  const isNarrow = useNarrowScreen();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => makeAudioLayer(`${import.meta.env.BASE_URL}sounds/ambient.mp3`, 0.3, 2000), []);
  useEffect(() => makeAudioLayer(`${import.meta.env.BASE_URL}sounds/music.mp3`, 0.08, 4000), []);

  // Close drawer when switching archetype
  useEffect(() => { setDrawerOpen(false); }, [archetype]);
  // Close drawer when screen widens past breakpoint
  useEffect(() => { if (!isNarrow) setDrawerOpen(false); }, [isNarrow]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          inset: '-16px',
          width: 'calc(100% + 32px)',
          height: 'calc(100% + 32px)',
          objectFit: 'cover',
          filter: 'blur(10px)',
          zIndex: -2,
          pointerEvents: 'none',
          animation: 'cc-reveal 2s ease both',
        }}
      >
        <source src={`${import.meta.env.BASE_URL}background.mp4`} type="video/mp4" />
      </video>

      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>

      <NoiseOverlay />

      {/* Control panel — fixed top-right on wide screens, drawer on narrow */}
      {isNarrow ? (
        <>
          <DrawerToggle open={drawerOpen} onClick={() => setDrawerOpen((o) => !o)} />

          {/* Backdrop */}
          {drawerOpen && (
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 28,
              }}
            />
          )}

          {/* Sliding drawer */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.24s ease',
              background: tokens.color.bgDeep,
              borderLeft: `1px solid ${tokens.color.borderSubtle}`,
              zIndex: 29,
              overflowY: 'auto',
            }}
          >
            <ControlPanel key={archetype} flat />
          </div>
        </>
      ) : (
        <div style={{ animation: 'cc-reveal 0.9s ease 2.4s both' }}>
          <ControlPanel key={archetype} />
        </div>
      )}

      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: TOP_BAND_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: BRACKET_GAP,
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 10,
          animation: 'cc-rise 1s ease 1.8s both',
        }}
      >
        <Bracket side="left" />
        <h1
          style={{
            margin: 0,
            fontFamily: tokens.font.display,
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: tokens.letterSpacing.display,
            textTransform: 'uppercase',
            color: tokens.color.textPrimary,
          }}
        >
          Gustav's Forge
        </h1>
        <Bracket side="right" />
      </header>

      <TypeSelector />
      <Footer />
      <ViewportFrame />
    </div>
  );
}
