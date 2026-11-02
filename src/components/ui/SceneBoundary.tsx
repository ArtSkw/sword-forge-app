import { Component, type ReactNode } from 'react';

// If the 3D scene fails (no WebGL, a lost context, an asset that will not load), the rest of the forge stays
// on screen with a short note, instead of the whole app going blank.
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Scene failed:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#D8C08A', font: '400 17px/1.45 Alegreya, serif' }}>
        <p style={{ maxWidth: 360, margin: 0 }}>The sword could not be drawn on this device. The forge needs WebGL: try another browser, or turn on hardware acceleration.</p>
      </div>
    );
  }
}
