import { type ReactNode, useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { ViewportFrame } from './ViewportFrame';
import { NoiseOverlay } from './NoiseOverlay';
import { AtmosphereOverlay } from './AtmosphereOverlay';
import { ForgeUI } from '../forge/ForgeUI';
import { makeAudioLayer, makePlaylist } from '../../lib/audio';
import { LOW_TIER } from '../../lib/tier';
import { setFireVideo } from '../../lib/forgeFire';

const ENTRY_EXIT_MS = 520;
// Music, in playing order (generated with ElevenLabs music, chosen by the author).
const MUSIC = ['music', 'music-vigil', 'music-strings', 'music-gamba'];

// The app's name already says "Forge", so the call to action only says how to go in: tap on touch screens.
const ENTER_LABEL = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'Tap to enter' : 'Click to enter';

function EntryScreen({ exiting, onEnter }: { exiting: boolean; onEnter: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label={ENTER_LABEL}
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
          {ENTER_LABEL}
        </span>
      </div>
    </button>
  );
}

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const [entryExiting, setEntryExiting] = useState(false);
  const audioCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      audioCleanupRef.current?.();
      audioCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!entryExiting) return;
    const timeout = window.setTimeout(() => setHasEntered(true), ENTRY_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [entryExiting]);

  const handleEnter = () => {
    if (entryExiting) return;
    if (!audioCleanupRef.current) {
      const stopAmbient = makeAudioLayer(`${import.meta.env.BASE_URL}sounds/ambient.mp3`, 0.3, 2000);
      // The tracks play one after another and loop, crossfading (see makePlaylist).
      const stopMusic = makePlaylist(MUSIC.map((m) => `${import.meta.env.BASE_URL}sounds/${m}.mp3`), 0.08, 4000);
      audioCleanupRef.current = () => {
        stopAmbient();
        stopMusic();
      };
    }
    setEntryExiting(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {LOW_TIER ? (
        <img src={`${import.meta.env.BASE_URL}background.webp`} alt="" aria-hidden="true"
          style={{ position: 'fixed', inset: '-16px', width: 'calc(100% + 32px)', height: 'calc(100% + 32px)', objectFit: 'cover', filter: 'blur(10px)', zIndex: -2, pointerEvents: 'none', animation: 'cc-reveal 2s ease both' }} />
      ) : <video
        // The 3D forge light follows the fire in this video (lib/forgeFire.ts).
        ref={setFireVideo}
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
      </video>}

      {hasEntered && <AtmosphereOverlay />}

      {hasEntered && <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}

      <NoiseOverlay />

      {/* backwards, not both: an animation still filling after it ends cuts the UI's frosted glass off from the 3D scene. */}
      {hasEntered && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', animation: 'cc-reveal 0.9s ease 1.6s backwards' }}>
          <ForgeUI />
        </div>
      )}
      <ViewportFrame />
      {!hasEntered && <EntryScreen exiting={entryExiting} onEnter={handleEnter} />}
    </div>
  );
}
