# Gustav's Forge

A 3D medieval sword configurator in the browser. Pick one of seven historical sword types, then work on it part by part in a forge lit by firelight.

**Live demo:** https://artskw.github.io/sword-forge-app/

---

## How it works

- **Seven sword types:** Arming Sword, Longsword, Bastard Sword, Viking Sword, Falchion, Estoc and Greatsword, chosen from a row of cards at the bottom.
- **Five parts:** blade, guard, grip, pommel and finish. Rest the pointer on the sword and rings mark each part; click one to work on it. Forms from the sword's own period come first, and later or legendary forms sit under "Other ages".
- **Inspector:** the panel on the right names the chosen part and its period, with extra options where they apply: leather dye for the grip, fittings and condition for the finish.
- **Historical account:** a parchment scroll with the sword's history, how it was fought, its weight and balance (estimated from the 3D model) and a description of its fittings.
- **Keyboard:** ←/→ move between parts, ↑/↓ change the variant, Esc goes back, H opens the account.
- **Sound:** forge ambience, music and anvil strikes, plus a slightly different cling for each sword type. One button mutes it all.
- **Screenshot:** saves a picture of the current sword.

The forge is built for desktop screens. Narrower screens get a notice and can carry on.

## Tech stack

- React 19 + TypeScript (strict)
- Three.js + @react-three/fiber + @react-three/drei
- Zustand for state
- Vite
- Web Audio API for layered ambience and pitch-shifted sounds
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
