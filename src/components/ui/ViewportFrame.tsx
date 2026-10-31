// Warm forge gradient matching the app atmosphere
const BG = 'linear-gradient(135deg, #2A1E10 0%, #3D2C18 35%, #4A3820 50%, #3D2C18 65%, #2A1E10 100%)';

// Creates a "donut" mask — shows only the padding area (the border band),
// making the inner content area fully transparent.
const MASK = 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)';

export function ViewportFrame() {
  return (
    // Gradient border band with rounded corners
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
        animation: 'cc-reveal 1s ease 0.8s both',
      }}
    />
  );
}
