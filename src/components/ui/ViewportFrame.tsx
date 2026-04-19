import { tokens } from '../../styles/tokens';

// Warm forge gradient matching the app atmosphere
const BG = 'linear-gradient(135deg, #2A1E10 0%, #3D2C18 35%, #4A3820 50%, #3D2C18 65%, #2A1E10 100%)';

// Creates a "donut" mask — shows only the padding area (the border band),
// making the inner content area fully transparent.
const MASK = 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)';

const ACCENT = tokens.color.borderAccent;

function EdgeDiamond({ edge }: { edge: 'top' | 'bottom' }) {
  const S = 10;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(-50%) translateY(${edge === 'top' ? '-50%' : '50%'})`,
    ...(edge === 'top' ? { top: 0 } : { bottom: 0 }),
  };
  return (
    <svg width={S} height={S} viewBox="0 0 10 10" style={style} aria-hidden="true">
      <polygon points="5,0 10,5 5,10 0,5" fill={ACCENT} />
    </svg>
  );
}

export function ViewportFrame() {
  return (
    <>
      {/* Gradient border band with rounded corners */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          padding: 3,
          background: BG,
          borderRadius: 10,
          // Mask punches out the inner rectangle, leaving only the 3px border band visible
          WebkitMask: MASK,
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
          zIndex: 20,
          animation: 'cc-reveal 1s ease 1.5s both',
        }}
      />

      {/* Edge diamonds sit on the border line — separate element so they aren't masked */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 21,
          animation: 'cc-reveal 1s ease 1.5s both',
        }}
      >
        <EdgeDiamond edge="top" />
        <EdgeDiamond edge="bottom" />
      </div>
    </>
  );
}
