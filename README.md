# Gustav's Forge

A 3D medieval sword configurator in the browser. Pick one of seven historical sword types, then work on it part by part in a forge lit by firelight.

**Live demo:** https://artskw.github.io/sword-forge-app/

---

## How it works

- **Seven sword types:** Arming Sword, Longsword, Bastard Sword, Viking Sword, Falchion, Estoc and Greatsword, chosen from a row of cards at the bottom.
- **Forms:** each type opens on a documented historical sword (for example the Whittlesea Mere arming sword or an Iberian montante). The name under the title switches between a type's Forms; once you change a part it reads "your variant", and **Back to default** returns to the Form.
- **Five parts:** blade, guard, grip, pommel and finish. Rest the pointer on the sword and rings mark each part; click one to work on it. Parts from the Form's own period come first, and parts from other ages sit under "Other ages". A small "i" marks a part, an end or a ring that is earlier or later than the Form, and says why.
- **Inspector:** the panel on the right names the chosen part and its period, links the museum object it follows, and offers the options that apply: blade section and ricasso, guard ends, écusson and side rings, grip shape and dye, fittings, steel finish and age.
- **Age:** a slider from "From the forge" to "Excavated". Every part ages with it: steel tarnishes and pits, iron and brass darken, leather, cord and wood wear and rot.
- **History & use:** a parchment scroll with the sword's history, how it was fought, its weight and balance (estimated from the 3D model) and its fittings.
- **Keyboard:** ←/→ move between parts, ↑/↓ change the variant, Esc goes back, H opens History & use.
- **Sound:** forge ambience and four music tracks that follow one another; every change makes one sound fitted to it (steel, fittings, wood, leather, a whetstone, an anvil ping), and each sword type has its own blade sound. One button mutes it all.
- **Screenshot:** saves a picture of the current sword.

### Screens

- **Desktop:** the inspector sits on the right, the part's variants and the part steps at the bottom.
- **Tablets:** the actions move to the top corners; History & use opens alone in the middle of the screen.
- **Phones:** a sheet at the bottom holds the part steps and variants; drag it up for every option. History & use opens as a full-screen document.
- Rendering adapts to the device: the resolution steps down when the frame rate cannot hold, and touch devices get lighter textures, meshes and a still background.

## Tech stack

- React 19 + TypeScript (strict)
- Three.js + @react-three/fiber + @react-three/drei, with custom shaders for blade grinds, surface wear and engraving
- Zustand for state
- Vite
- Web Audio API for sound effects; generated sound effects and music (ElevenLabs)
- Hugeicons for interface icons
- GitHub Pages for hosting

## Getting started

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run deploy
```

Builds the app and publishes it to GitHub Pages with `gh-pages`.
