import { EffectComposer, Bloom } from '@react-three/postprocessing';

export function Postprocessing() {
  return (
    <EffectComposer>
      <Bloom intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
    </EffectComposer>
  );
}
