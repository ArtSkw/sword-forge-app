import * as THREE from 'three';
import { LOW_TIER } from '../../lib/tier';

// The oiled wood grain shared by wooden grips and the Messer's scales.

const BASE = import.meta.env.BASE_URL;
let woodMap: THREE.Texture | null = null;
/** Oiled ash grain for wooden grips and Messer scales (one tile round the grip, every 9 cm along it). */
export function woodTexture() {
  if (!woodMap) {
    woodMap = new THREE.TextureLoader().load(`${BASE}textures/wood${LOW_TIER ? '-512' : ''}.webp`);
    woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
    woodMap.colorSpace = THREE.SRGBColorSpace;
    woodMap.anisotropy = 16;
    woodMap.repeat.set(1, 1 / 0.09);
  }
  return woodMap;
}
