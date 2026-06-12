import { type ReactNode, useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { TypeSelector } from './TypeSelector';
import { ControlPanel } from './ControlPanel';
import { Footer } from './Footer';
import { ViewportFrame } from './ViewportFrame';
import { NoiseOverlay } from './NoiseOverlay';
import { AtmosphereOverlay } from './AtmosphereOverlay';
import { useConfigStore } from '../../store/configStore';
import { makeAudioLayer } from '../../lib/audio';
import { useViewportSize } from '../../hooks/useViewportSize';
import { Button } from './primitives/Button';

const TOP_BAND_HEIGHT = 64;
const BRACKET_SIZE = 14;
const BRACKET_GAP = 20;
const DRAWER_WIDTH = 300;
const NARROW_BREAKPOINT = 900;
const DESKTOP_NOTICE_BREAKPOINT = 900;

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

function DesktopRecommendation({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 42,
        display: 'grid',
        placeItems: 'center',
        padding: 22,
        background: 'rgba(5, 3, 2, 0.66)',
        backdropFilter: 'blur(6px)',
        animation: 'cc-reveal 0.35s ease both',
      }}
    >
      <div
        style={{
          width: 'min(100%, 430px)',
          position: 'relative',
          padding: '24px 22px 22px',
          background: `linear-gradient(180deg, rgba(28, 24, 20, 0.96), rgba(10, 9, 7, 0.98))`,
          border: `1px solid ${tokens.color.borderAccent}`,
          borderRadius: tokens.radius.sharp,
          boxShadow: tokens.shadow.panel,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
          }}
        >
          <Bracket side="left" />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}
        >
          <Bracket side="right" />
        </div>
        <h2
          style={{
            margin: '6px 0 12px',
            fontFamily: tokens.font.display,
            fontWeight: 500,
            fontSize: 18,
            letterSpacing: tokens.letterSpacing.display,
            textTransform: 'uppercase',
            color: tokens.color.textPrimary,
          }}
        >
          Wider Display Recommended
        </h2>
        <p
          style={{
            margin: '0 auto 20px',
            maxWidth: 330,
            fontFamily: tokens.font.control,
            fontSize: 18,
            lineHeight: 1.35,
            color: tokens.color.textSecondary,
          }}
        >
          The forge is tuned for a desktop canvas, where the sword model and controls have room to breathe.
        </p>
        <Button label="Continue" onClick={onDismiss} compact />
      </div>
    </div>
  );
}

const ENTRY_EXIT_MS = 520;

function EntryScreen({ exiting, onEnter }: { exiting: boolean; onEnter: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label="Click to enter"
      disabled={exiting}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(ellipse 50% 42% at 50% 46%, rgba(9, 6, 4, 0.34), rgba(3, 2, 1, 0.86) 72%, rgba(2, 1, 1, 0.96) 100%)',
        border: 0,
        color: tokens.color.textPrimary,
        cursor: exiting ? 'default' : 'pointer',
        animation: exiting ? 'cc-entry-exit 0.52s ease both' : 'cc-reveal 0.2s ease both',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#020101',
          animation: 'cc-entry-blackout 2.05s ease both',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          textAlign: 'center',
          pointerEvents: 'none',
          position: 'relative',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            filter:
              'invert(86%) sepia(20%) saturate(680%) hue-rotate(356deg) brightness(92%) contrast(88%) drop-shadow(0 0 16px rgba(201, 169, 97, 0.22))',
            opacity: 0.9,
            animation: 'cc-entry-layer 0.95s ease 1.75s both',
          }}
        />
        <h1
          style={{
            margin: 0,
            fontFamily: tokens.font.display,
            fontWeight: 500,
            fontSize: 'clamp(22px, 3vw, 34px)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: tokens.color.textPrimary,
            animation: 'cc-entry-layer 0.95s ease 2.25s both',
          }}
        >
          Gustav&apos;s Forge
        </h1>
        <span
          style={{
            marginTop: 4,
            fontFamily: tokens.font.display,
            fontSize: 13,
            letterSpacing: tokens.letterSpacing.display,
            textTransform: 'uppercase',
            color: tokens.color.textSecondary,
            animation: 'cc-entry-layer 0.95s ease 2.75s both',
          }}
        >
          Click to enter
        </span>
      </div>
    </button>
  );
}

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const archetype = useConfigStore((s) => s.config.archetype);
  const isNarrow = useNarrowScreen();
  const { width } = useViewportSize();
  const [hasEntered, setHasEntered] = useState(false);
  const [entryExiting, setEntryExiting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const showDesktopNotice = hasEntered && width < DESKTOP_NOTICE_BREAKPOINT && !noticeDismissed;

  useEffect(() => {
    if (!hasEntered) return;
    return makeAudioLayer(`${import.meta.env.BASE_URL}sounds/ambient.mp3`, 0.3, 2000);
  }, [hasEntered]);
  useEffect(() => {
    if (!hasEntered) return;
    return makeAudioLayer(`${import.meta.env.BASE_URL}sounds/music.mp3`, 0.08, 4000);
  }, [hasEntered]);

  // Close drawer when switching archetype
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawerOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [archetype]);
  // Close drawer when screen widens past breakpoint
  useEffect(() => {
    if (isNarrow) return;
    const frame = requestAnimationFrame(() => setDrawerOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [isNarrow]);

  useEffect(() => {
    if (!entryExiting) return;
    const timeout = window.setTimeout(() => setHasEntered(true), ENTRY_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [entryExiting]);

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

      {hasEntered && <AtmosphereOverlay />}

      {hasEntered && <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}

      <NoiseOverlay />

      {/* Control panel — fixed top-right on wide screens, drawer on narrow */}
      {hasEntered && isNarrow ? (
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
      ) : hasEntered ? (
        <div style={{ animation: 'cc-reveal 0.9s ease 2s both' }}>
          <ControlPanel key={archetype} />
        </div>
      ) : null}

      {hasEntered && <header
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
          animation: 'cc-rise 1s ease 1.2s both',
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
      </header>}

      {hasEntered && <TypeSelector />}
      {hasEntered && <Footer />}
      <ViewportFrame />
      {!hasEntered && <EntryScreen exiting={entryExiting} onEnter={() => setEntryExiting(true)} />}
      {showDesktopNotice && <DesktopRecommendation onDismiss={() => setNoticeDismissed(true)} />}
    </div>
  );
}
