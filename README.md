# Gustav's Forge

An interactive 3D sword configurator set in a medieval forge atmosphere. Choose from seven historical sword archetypes and customize the blade finish, metal tone, guard style, and grip to craft your own weapon.

**Live demo:** https://artskw.github.io/sword-forge-app/

---

## Features

- **Seven sword archetypes** — Arming Sword, Longsword, Bastard Sword, Viking Sword, Falchion, Estoc, Greatsword
- **Real-time 3D rendering** via Three.js with animated forge lighting
- **Customizable finish** — blade condition, metal tone, guard style, grip length and color
- **Immersive atmosphere** — blurred video background, ambient forge sounds, medieval background music, and subtle per-sword cling sounds on selection
- **Export** — copy current configuration as JSON; take a screenshot of the scene
- **Responsive layout** — full panel on wide screens, slide-out drawer on narrow viewports

## Tech Stack

- React 19 + TypeScript (strict)
- Three.js + @react-three/fiber + @react-three/drei
- Zustand (state management)
- Vite
- Web Audio API (pitch-shifted cling sounds, ambient layering)
- GitHub Pages (deployment)

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run deploy
```

Builds and publishes to GitHub Pages via `gh-pages`.
