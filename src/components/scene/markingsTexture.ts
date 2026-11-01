import * as THREE from 'three';

// Bakes a blade's inscription, reverse and smith's mark into one mask texture. The texture covers a stretch
// of the blade from just above the guard (REGION_START) for REGION_LEN metres, the full blade width across.
// Upper half: the front face; lower half: the reverse (the shader mirrors it so it reads the right way).
// Letters are drawn at their real size in metres, so a long name fills the fuller as on the originals.

export const REGION_START = 0.035, REGION_LEN = 0.3;
const W = 2048, H = 512, BAND = H / 2;

export type MarkingsInput = { front?: string; back?: string | 'lattice'; mark?: string; halfWidth: number; singleEdged: boolean };

function drawText(x: CanvasRenderingContext2D, text: string, pxAlong: number, pxAcross: number, cy: number, startM: number, letterM: number) {
  x.save();
  // Fonts cannot be sized in metres (a 0.012 px font draws nothing), so draw in pixels across the blade
  // and stretch along it: one unit = 1 px across, pxAlong / pxAcross px along.
  const k = pxAlong / pxAcross;
  x.setTransform(k, 0, 0, 1, 0, cy);
  x.font = `600 ${(letterM * pxAcross).toFixed(1)}px Cinzel, "Times New Roman", serif`;
  x.textBaseline = 'middle';
  const gap = letterM * pxAcross * 0.08;
  let px = startM * pxAcross;
  for (const ch of [...text]) {
    const w = x.measureText(ch).width * 0.92;
    x.save();
    x.translate(px + w / 2, 0);
    x.scale(0.9, 1);   // a little narrow, as welded-in rods were
    x.fillText(ch, -w / 2, 0);
    x.restore();
    px += w + gap;
  }
  x.restore();
  return px / pxAcross;   // where the text ends, in metres
}

function drawLattice(x: CanvasRenderingContext2D, pxAlong: number, pxAcross: number, cy: number, startM: number, lenM: number, hM: number) {
  x.save();
  x.setTransform(pxAlong, 0, 0, pxAcross, 0, cy);
  x.lineWidth = hM * 0.13;
  x.strokeStyle = '#fff';
  x.beginPath();
  // Vertical strokes framing a run of woven rhombi (the Ulfberht reverse: "a woven lattice between strokes").
  for (const at of [0, 0.06, lenM - 0.06, lenM]) { x.moveTo(startM + at, -hM / 2); x.lineTo(startM + at, hM / 2); }
  const n = 5, step = (lenM - 0.16) / n;
  for (let i = 0; i <= n; i++) {
    const cx = startM + 0.08 + i * step;
    x.moveTo(cx - step / 2, 0); x.lineTo(cx, -hM / 2); x.lineTo(cx + step / 2, 0); x.lineTo(cx, hM / 2); x.closePath();
  }
  x.stroke();
  x.restore();
}

function drawMark(x: CanvasRenderingContext2D, mark: string, pxAlong: number, pxAcross: number, cy: number, atM: number, sizeM: number) {
  x.save();
  x.setTransform(pxAlong * sizeM, 0, 0, pxAcross * sizeM, atM * pxAlong, cy);
  x.lineWidth = 0.09; x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#fff'; x.fillStyle = '#fff';
  x.beginPath();
  if (mark === 'wolf') {
    // The Passau wolf: a running stick-figure beast, head toward the point.
    x.moveTo(-0.38, 0.05); x.lineTo(0.22, -0.02);                         // back
    x.moveTo(0.22, -0.02); x.lineTo(0.38, -0.16); x.lineTo(0.46, -0.06);  // head and muzzle
    x.moveTo(0.36, -0.15); x.lineTo(0.34, -0.26);                         // ear
    x.moveTo(-0.38, 0.05); x.lineTo(-0.5, -0.12);                          // tail
    x.moveTo(0.12, -0.01); x.lineTo(0.2, 0.22); x.moveTo(0.12, -0.01); x.lineTo(0.02, 0.24);   // forelegs
    x.moveTo(-0.28, 0.04); x.lineTo(-0.2, 0.26); x.moveTo(-0.28, 0.04); x.lineTo(-0.4, 0.24);  // hind legs
  } else if (mark === 'orb') {
    x.arc(0, 0.1, 0.2, Math.PI, 0); x.closePath();
    x.moveTo(0, -0.1); x.lineTo(0, -0.42); x.moveTo(-0.12, -0.3); x.lineTo(0.12, -0.3);
  } else if (mark === 'crescents') {
    for (const dx of [-0.32, 0, 0.32]) { x.moveTo(dx + 0.12, -0.14); x.arc(dx, 0, 0.18, -0.85, 0.85, true); }
  } else if (mark === 'cross') {
    x.arc(0, 0, 0.3, 0, Math.PI * 2);
    x.moveTo(0, -0.22); x.lineTo(0, 0.22); x.moveTo(-0.22, 0); x.lineTo(0.22, 0);
  }
  x.stroke();
  x.restore();
}

/** The mask texture, or null when the blade carries nothing. */
export function markingsTexture({ front, back, mark, halfWidth, singleEdged }: MarkingsInput): THREE.CanvasTexture | null {
  if (!front && !mark) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff';
  const pxAlong = W / REGION_LEN, pxAcross = BAND / (2 * halfWidth);
  // Letters about 1.1 cm tall in the fuller (a single-edged blade carries them a little toward the back).
  const letterM = Math.min(0.012, halfWidth * 0.5), off = singleEdged ? -halfWidth * 0.25 : 0;
  const frontY = BAND / 2 + off * pxAcross, backY = BAND + BAND / 2 - off * pxAcross;
  let end = 0;
  if (front) end = drawText(x, front, pxAlong, pxAcross, frontY, 0.008, letterM);
  if (back === 'lattice') drawLattice(x, pxAlong, pxAcross, backY, 0.008, Math.max(0.1, end - 0.008), letterM);
  else if (back) drawText(x, back, pxAlong, pxAcross, backY, 0.008, letterM);
  // Marks sit 10–25 cm below the guard on the front face, after any inscription.
  if (mark) drawMark(x, mark, pxAlong, pxAcross, frontY, Math.max(0.1, end + 0.03), Math.min(0.022, halfWidth * 0.9));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
