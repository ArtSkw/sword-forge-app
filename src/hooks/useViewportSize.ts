import { useEffect, useState } from 'react';

type ViewportSize = {
  width: number;
  height: number;
};

function getViewportSize(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useViewportSize() {
  const [size, setSize] = useState<ViewportSize>(() => getViewportSize());

  useEffect(() => {
    const handleResize = () => setSize(getViewportSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
