import { useEffect, useRef } from 'react';

// Generates a 256×256 white-noise texture once on mount and tiles it at 2% opacity
// to eliminate gradient banding on the dark background.
export function NoiseOverlay() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SIZE = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(SIZE, SIZE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (ref.current) ref.current.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
        opacity: 0.02,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
