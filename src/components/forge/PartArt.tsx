// A part card's picture: the part rendered alone by our own engine and painted in the type cards' style
// (public/parts/<name>.webp). Grips and steel finishes are close-ups of the material, and blades run out through a corner, so
// they fill the card.
const BASE = import.meta.env.BASE_URL;

export function PartArt({ name, bleed = false }: { name: string; bleed?: boolean }) {
  return <img className={bleed ? 'part-art bleed' : 'part-art'} src={`${BASE}parts/${name}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />;
}
