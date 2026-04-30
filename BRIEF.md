# Sword Forge — Project Brief

## What we're building

A real-time 3D medieval sword customizer that runs locally in the browser.
Users pick a sword archetype (arming sword, longsword, Viking sword, etc.),
tweak a small set of style parameters, and watch the 3D model update live.

The goal is exploration and delight, not historical CAD precision. Think
"character creator, but for swords" — curated options over raw sliders,
instant feedback, screenshot-worthy results.

Inspired by the weapon preview aesthetic of Kingdom Come: Deliverance 2
and The Witcher 3 — game-model fidelity, not photorealism, but with
enough craft that a single screenshot feels like it could be from a game.

This is a personal project. Not shipping, not commercial. Optimize for
iteration speed and fun.

> Planning note: this brief captures the original product direction and remains
> useful for tone, UI, and scene goals. The current implementation plan lives in
> `ROADMAP.md` and supersedes the older build-order and finish-control wording
> where they differ. In particular, finish is evolving from a blade-only setting
> into a whole-sword condition/material system.

---

## Stack

- **Vite + React + TypeScript** — project scaffold
- **three** (latest) + **@react-three/fiber** + **@react-three/drei** — 3D scene
- **@react-three/postprocessing** — bloom for blade highlights
- **leva** — parametric controls (themed to match UI, see Visual Style)
- **zustand** — state store for sword config
- **@fontsource/cinzel** + **@fontsource/inter** + **@fontsource/jetbrains-mono** — self-hosted fonts
- **tailwindcss** — styling for custom UI outside the 3D canvas

Use TypeScript strictly throughout. Prefer small focused components over
large ones. Put all "magic numbers" (blade proportions, default colors,
camera distances) in named constants.

---

## Project structure

```
sword-forge/
├── public/
│   └── hdri/                       # put HDRI file here later
├── src/
│   ├── components/
│   │   ├── scene/
│   │   │   ├── Scene.tsx           # R3F canvas setup, lighting, environment
│   │   │   ├── Sword.tsx           # composition of all sword parts
│   │   │   ├── Blade.tsx
│   │   │   ├── Crossguard.tsx
│   │   │   ├── Grip.tsx
│   │   │   ├── Pommel.tsx
│   │   │   ├── Lighting.tsx
│   │   │   └── Postprocessing.tsx
│   │   ├── ui/
│   │   │   ├── AppShell.tsx        # top bar, viewport frame, footer
│   │   │   ├── TypeSelector.tsx    # hero archetype picker
│   │   │   ├── ControlPanel.tsx    # themed Leva wrapper + section headers
│   │   │   ├── Footer.tsx          # screenshot / export buttons
│   │   │   └── primitives/
│   │   │       ├── Button.tsx
│   │   │       ├── Divider.tsx     # fleuron divider
│   │   │       └── SectionHeader.tsx
│   ├── presets/
│   │   ├── swordTypes.ts           # 7 archetype configs
│   │   ├── pommelProfiles.ts       # Vector2[] profiles per pommel style
│   │   ├── guardProfiles.ts        # crossguard shape definitions
│   │   └── bladeProfiles.ts        # cross-section shapes
│   ├── store/
│   │   └── configStore.ts          # zustand store + actions
│   ├── styles/
│   │   ├── tokens.ts               # design tokens as TS exports
│   │   ├── tokens.css              # same tokens as CSS variables
│   │   └── globals.css             # base styles, font imports
│   ├── lib/
│   │   ├── exportConfig.ts         # JSON config export
│   │   └── screenshot.ts           # canvas-to-PNG
│   ├── App.tsx
│   └── main.tsx
├── BRIEF.md                        # this file
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Layout

Full-viewport 3D scene. No sidebar — we want the sword to breathe.

- **Top band (64px tall)**: app name "SWORD FORGE" centered in Cinzel,
  flanked by small brass ornamental brackets. Transparent background,
  sits over the scene.
- **Main viewport**: fills the screen. 3D scene. Dark radial gradient
  background (see Visual Style).
- **Type selector**: horizontal row of archetype cards, docked to the
  bottom-center of the viewport, ~24px from the bottom edge. Scrolls
  horizontally if it overflows.
- **Control panel (Leva)**: docked to the top-right, ~24px from edges.
  Themed to match. Collapsible.
- **Footer controls**: bottom-right corner, Screenshot and Export buttons.

On narrow screens (< 900px wide), collapse the control panel into a
drawer that opens from the right via a button.

---

## Visual style — "Forged UI"

The interface should feel like it belongs in the world of the sword, not
next to it. Reference aesthetic: **thewitcher.com/witcher3** meets
**deepsilver.com/games/kingdom-come-deliverance-ii**. Restrained,
modern-medieval. Not fantasy cosplay.

**Hard rules** — avoid these traps:
- No parchment textures, no stone textures, no faux-paper backgrounds
- No blackletter / Gothic / calligraphic fonts
- No rounded corners beyond 2px
- No glass-morphism, no neumorphism, no frosted panels
- No emoji icons (crossed swords, shields — cheap)
- No heraldic motifs in backgrounds (the sword is the hero)
- Accent color must appear sparingly. If more than ~5% of the viewport
  is brass/gold, it's too much.

### Design tokens

Create these in `src/styles/tokens.ts` (as TS exports) and mirror them
as CSS custom properties in `src/styles/tokens.css`.

```ts
export const tokens = {
  color: {
    bgDeep: '#0A0907',           // primary background, warm near-black
    bgPanel: '#13100C',          // panel backgrounds
    bgRaised: '#1C1814',         // raised elements, dropdowns
    borderSubtle: '#2A2520',     // subtle dividers
    borderAccent: '#8B6F47',     // antique brass — used sparingly
    borderAccentBright: '#C9A961', // brighter brass for active/focus
    textPrimary: '#E8E0D4',      // warm off-white, never pure white
    textSecondary: '#9A8F7F',    // muted tan for labels
    textMuted: '#5A5248',        // disabled, fine print
    accentCrimson: '#8B2028',    // deep blood-red — reserved for critical emphasis
  },
  shadow: {
    panel: '0 12px 40px rgba(0, 0, 0, 0.6)',
    brassGlow: '0 0 12px rgba(201, 169, 97, 0.2)',
  },
  radius: {
    none: '0px',
    sharp: '2px',
  },
  font: {
    display: '"Cinzel", serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  letterSpacing: {
    display: '0.1em',
  },
} as const;
```

### Typography

- **Display / headings**: Cinzel, always uppercase, letter-spacing 0.1em.
  Used for section headers, button labels, app title, archetype names.
- **UI / body**: Inter. Used for descriptions, labels inside controls,
  help text.
- **Numeric readouts** (slider values, stats): JetBrains Mono with
  tabular figures (`font-variant-numeric: tabular-nums`).

### Components

**Buttons** (primitive):
- Primary: transparent fill, 1px `borderAccent` border, `textPrimary`
  label, sharp corners (2px), 12px vertical / 24px horizontal padding,
  Cinzel uppercase label.
- Hover: border → `borderAccentBright`, slight brass glow via
  `shadow.brassGlow`. No fill change.
- Active/pressed: subtle inset shadow, border stays bright.
- Secondary: `borderSubtle` border → `borderAccent` on hover.
- Destructive (e.g. "Reset"): `accentCrimson` border, same otherwise.

**Section headers**:
- Cinzel, 12px, uppercase, letter-spaced.
- Thin 1px `borderAccent` underline that extends only slightly past
  the text (not full-width) — like an incised line.

**Fleuron divider**:
- 1px `borderSubtle` horizontal line with a small diamond (◆) or simple
  SVG fleuron centered on it, in `borderAccent` color.

**Panels**:
- Background: `bgPanel`
- Border: 1px `borderSubtle`
- Sharp corners (2px max)
- Shadow: `shadow.panel`
- Interior padding: 20px

### Type selector — the hero control

This is the most prominent control, designed as a dedicated component
(not a Leva dropdown).

- Horizontal row of cards, each 120px wide, 140px tall.
- Card contents (top to bottom): small monochrome silhouette SVG of the
  sword type (~60px tall), archetype name in Cinzel uppercase (11px,
  letter-spaced).
- Card background: `bgPanel` with subtle gradient to `bgDeep` at bottom.
- Default border: 1px `borderSubtle`.
- Selected: 1px `borderAccentBright` border + inner glow
  (`inset 0 0 24px rgba(201, 169, 97, 0.1)`).
- Hover (not selected): border → `borderAccent`, two tiny brass L-shaped
  corner brackets fade in at the top-left and bottom-right corners (6px
  each, 1px stroke). Subtle but noticeable.

For the silhouettes, start with simple SVG outlines — don't over-engineer.
One per archetype. Minimal detail, just enough to distinguish.

### Leva theming

Override Leva's default theme to match the tokens. Pass theme via the
`<Leva theme={...}>` wrapper. Map:
- `colors.elevation1` → `bgDeep`
- `colors.elevation2` → `bgPanel`
- `colors.elevation3` → `bgRaised`
- `colors.accent1/2/3` → `borderAccent` and `borderAccentBright`
- `colors.highlight1/2/3` → `textMuted`, `textSecondary`, `textPrimary`
- `radii.xs/sm/lg` → `0px` or `2px`
- `fonts.mono` → JetBrains Mono
- `fonts.sans` → Inter

If Leva's theming hits a ceiling (e.g. can't match section headers),
build custom wrapper components around Leva's primitives rather than
fighting the library.

### Background treatment

- Main viewport: radial gradient from `bgDeep` at center to near-pure
  black at edges.
- Optional: 1-2% opacity noise texture overlay to avoid gradient banding.
- No decorative patterns, no heraldic motifs, no textures trying to
  simulate materials.

### Ornament budget

Across the entire app, you get:
- One small decorative header band with app name + two brass brackets.
- Fleuron dividers between major sections (use ~3 times max total).
- Corner brackets on hovered archetype cards.

That's it. The medieval feel comes from **color palette + typography
+ restraint** — not from decoration quantity. If in doubt, remove an
ornament.

---

## 3D scene setup

Use a full-viewport `<Canvas>` from `@react-three/fiber`.

- **Environment**: start with `<Environment preset="studio" />` from drei.
  We'll swap to a custom HDRI later (place files in `public/hdri/`).
- **Contact shadows**: `<ContactShadows>` below the sword, blur 2,
  opacity 0.4, far 4.
- **Controls**: `<OrbitControls>` with damping enabled, no pan,
  min/max polar angle constrained so the sword can't be inspected
  from directly above/below (looks bad), zoom limited.
- **Auto-rotation**: sword rotates slowly around Y axis (~0.2 rad/s)
  when user hasn't interacted recently. Pauses on interaction, resumes
  after 3 seconds of inactivity.
- **Camera**: perspective, 35° FOV. Position dynamically based on
  current blade length so the sword always fills ~70% of vertical frame.
  Lerp position on archetype changes (400ms).
- **Postprocessing**: `<EffectComposer>` with subtle `<Bloom>`
  (intensity 0.3, luminanceThreshold 0.9, luminanceSmoothing 0.2).
  Just enough to make polished blade highlights pop.
- **Background**: transparent canvas over the CSS gradient (don't use
  a three.js background — let the CSS handle it for perfect consistency
  with the UI).

---

## Sword geometry — where quality lives

This is the part not to cut corners on. A flat box with a painted line
down the middle won't feel like a sword. Every part should have real
geometry.

### Blade

- Built with `ExtrudeGeometry` from a 2D cross-section shape.
- Default cross-section is **lenticular** (lens-shaped): widest in the
  middle, tapering smoothly to edges. Define this shape as a series of
  Bezier points in `src/presets/bladeProfiles.ts`.
- The shape is swept along the blade's length with a **taper**: full
  width at the base, linearly (or with a slight curve) reducing to ~30%
  width at the tip. Tip is acute, not rounded.
- **Secondary edge bevel**: the thin facet along each edge must be real
  geometry. It's what catches light in the reference images (look at the
  KCD2 sword — the bright highlight line running parallel to the edge).
- **Fuller**: a subtractive groove cut into the cross-section. Starts
  ~10% down from the base (after the ricasso), ends ~65% down the blade
  (not all the way to the tip). Depth is ~20% of blade thickness at that
  point. For the `double` fuller style, two parallel grooves.
- Blade also has a subtle **distal taper** — it gets thinner from base to
  tip, not just narrower. Apply this in the extrusion by scaling the
  cross-section shape along Z as well as X.

### Crossguard

- Parametric based on style.
- `straight`: chamfered box, ~22cm long, ~2cm tall, ~1.5cm thick at
  center, tapering slightly toward the ends.
- `curved`: same base but ends curve forward toward the blade tip by
  ~15°.
- `ornate`: straight base with small lathe-turned scroll terminals
  at each end (tiny onion-shaped forms using `LatheGeometry`).
- `fantasy`: exaggerated, asymmetric, stylized — think Witcher's
  griffin/wolf-school guards. Some artistic license.

### Grip

- Core is a cylinder with a subtle taper (slightly thicker in the middle,
  narrower at the ends).
- Wrapping: for a first pass, use a repeating normal map for the
  diagonal cord/leather ridges. Later iteration can replace this with
  actual helical geometry (sweep a small torus along a helix around
  the grip core) — leave that as a TODO comment in `Grip.tsx`.
- Length varies per archetype — short for arming swords, long for
  longswords and bastard swords.

### Pommel

This is where the sword gets its personality. **Each pommel style must
be a distinct, hand-authored `Vector2[]` profile, used with `LatheGeometry`.**
Don't just scale a sphere.

Profiles to define in `src/presets/pommelProfiles.ts`:
- `wheel` — disc shape with chamfered rim and small recessed center
  (where the brass rivet sits in the KCD2 reference). Classic knightly
  sword pommel.
- `disc` — flatter than wheel, no recessed center.
- `scent-stopper` — classic tapered-mushroom silhouette (wide at base,
  narrow neck, wider top, domed cap).
- `brazil-nut` — rounded triangular profile, common on Viking swords.
- `fishtail` — flared, decorative medieval late-period shape.
- `ornate` — base wheel shape + decorative ring details.
- `fantasy` — stylized, exaggerated, inspired by Witcher's wolf-school
  pommel aesthetic. Artistic license.

Each profile function returns a `Vector2[]` array. Lathe around Y axis.
Segment count 32 for smooth curvature.

---

## Controls (Leva panel)

Organized into sections. Section headers use the themed `SectionHeader`
component, not Leva's default folder labels (override or overlay).

### Blade
- **Length**: dropdown — Short (80cm) / Medium (95cm) / Long (110cm) / Extra Long (130cm)
- **Width**: dropdown — Narrow / Standard / Wide
- **Fuller**: dropdown — None / Single / Double / Decorative

### Guard & Pommel
- **Guard style**: dropdown — Straight / Curved / Ornate / Fantasy
- **Pommel style**: dropdown — Wheel / Disc / Scent-stopper / Brazil Nut / Fishtail / Ornate / Fantasy

### Finish
- **Blade finish**: dropdown — Pristine / Used / Battle-worn / Ancient
- **Metal tone**: dropdown — Steel / Darkened / Golden Accents
- **Grip color**: color picker, default warm brown `#6B4423`

### Fantasy Mode (toggle, default off)
When enabled, unlocks:
- **Runes on blade**: toggle — adds subtle emissive engraving along the
  fuller. Generate simple rune-like glyph strings procedurally.
- **Gemstone in pommel**: dropdown — None / Ruby / Sapphire / Emerald /
  Amber. Replaces the rivet in wheel/disc pommels with a faceted stone
  using a glass-like material.

---

## Archetype presets (`src/presets/swordTypes.ts`)

Each archetype is a complete config that sets all parameters above.
Selecting one smoothly lerps geometry over 400ms (where possible) and
snaps enum values (guard style, pommel style).

Define these seven archetypes with historically plausible defaults:

| Archetype | Blade L | Blade W | Fuller | Guard | Pommel | Grip length |
|---|---|---|---|---|---|---|
| Arming Sword | Medium | Standard | Single | Straight | Wheel | Short |
| Longsword | Long | Standard | Single | Straight | Wheel | Long |
| Bastard Sword | Long | Standard | Single | Curved | Scent-stopper | Long |
| Viking Sword | Short | Wide | Single | Straight | Brazil Nut | Short |
| Falchion | Medium | Wide | None | Curved | Disc | Short |
| Estoc | Extra Long | Narrow | None | Straight | Wheel | Long |
| Greatsword | Extra Long | Wide | Double | Curved | Fishtail | Long |

Feel free to add a short `description` field per archetype — one
sentence of flavor text for the card tooltip.

---

## State management

Single zustand store in `src/store/configStore.ts`:

```ts
interface SwordConfig {
  archetype: ArchetypeKey;
  blade: {
    length: BladeLength;
    width: BladeWidth;
    fuller: FullerStyle;
  };
  guard: { style: GuardStyle };
  pommel: { style: PommelStyle };
  finish: {
    blade: BladeFinish;
    metalTone: MetalTone;
    gripColor: string;
  };
  fantasy: {
    enabled: boolean;
    runes: boolean;
    gemstone: GemstoneType;
  };
}

interface ConfigStore {
  config: SwordConfig;
  setArchetype: (key: ArchetypeKey) => void;  // applies full preset
  update: <K extends keyof SwordConfig>(key: K, value: Partial<SwordConfig[K]>) => void;
  reset: () => void;
}
```

Leva controls bind to this store. Archetype selector calls
`setArchetype` which replaces the full config.

---

## Materials

All metal parts use `MeshStandardMaterial`:

**Blade**:
- `metalness: 1.0`
- `roughness`: 0.15 (Pristine) → 0.3 (Used) → 0.5 (Battle-worn) → 0.65 (Ancient)
- Battle-worn and Ancient finishes add a subtle normal map (micro-scratches).
- Ancient finish also reduces base color slightly toward warm gray
  (oxidation tint).

**Guard & Pommel**:
- Same metalness 1.0, roughness 0.3 baseline.
- Metal tone:
  - `Steel`: base color `#C8CCD0`
  - `Darkened`: multiply base color toward `#3A3832` (blued steel look)
  - `Golden Accents`: base stays steel, but rivets / pommel center /
    guard terminals shift to `#B8925A` with slight emissive warmth.

**Grip**:
- `MeshStandardMaterial`, `metalness: 0`, `roughness: 0.7`.
- Base color from `gripColor` state.
- Normal map for wrap texture (once available — placeholder flat OK initially).

---

## Footer actions

Two buttons in the bottom-right corner (primitive `Button` component):

- **Screenshot** — captures the current canvas as PNG at 2x resolution,
  downloads via blob. Implementation in `src/lib/screenshot.ts` using
  `canvas.toBlob`. Hide UI during capture (hide OrbitControls helper,
  hide auto-rotation pause indicator if any) so only the sword appears.

- **Export config** — serializes the current zustand config state to JSON
  and copies to clipboard. Toast confirmation ("Configuration copied").

Later additions (leave as TODOs): config import, share URL with
base64-encoded config, save to local gallery.

---

## Build order

Don't try to do everything at once. Work in this order, pausing for
review at each milestone so I can steer quality before you move on:

1. **Scaffold** — Vite + TS + deps installed. Empty Canvas rendering a
   placeholder cube. Tokens + globals.css + fonts loaded. Verify the
   radial-gradient background reads correctly on-screen.
2. **Minimal sword** — four parts (box blade + box guard + cylinder grip
   + sphere pommel) assembled in the right proportions. Archetype
   selector wired up but just logs to console.
3. **Real blade geometry** — ExtrudeGeometry with lenticular cross-section,
   taper, fuller as geometric groove. This is the make-or-break iteration.
4. **Real pommel profiles** — all 7 pommel shapes as hand-authored
   LatheGeometry profiles. Take time on these.
5. **Crossguard variations** — all 4 guard styles.
6. **Materials + lighting pass** — HDRI environment working, metal looks
   like metal, bloom dialed in. This is where the "it looks like a game
   screenshot" moment happens.
7. **UI layer** — themed Leva, TypeSelector hero component, top band,
   footer buttons. Styling polish per the Visual Style section.
8. **Finish variations + Fantasy Mode** — blade finishes, metal tones,
   runes, gemstones.
9. **Polish** — screenshot capture, config export, responsive drawer,
   any remaining animation smoothing, noise texture on background.

After each milestone, stop and let me review before continuing. Small
commits per milestone, clear messages.

---

## Constraints & taste notes

- Prefer doing fewer things well over many things poorly. If you're
  tempted to add a feature I didn't ask for, leave it as a TODO comment
  instead.
- The app should feel fast. No loading spinners except possibly for the
  initial HDRI load. Geometry recalculations should be instant.
- When in doubt about visual density: remove something. The reference
  game sites succeed through restraint.
- Default values for every control should produce a beautiful sword.
  A first-time user who doesn't touch any controls should still see
  something worth screenshotting.
- Write code that's easy to tweak. Named constants, clear prop names,
  small components. I'll be iterating on this a lot.

---

## First task

Start with step 1 from the build order: scaffold the project with
the full stack, set up design tokens and fonts, render an empty Canvas
with the radial-gradient background, and confirm fonts load correctly
by rendering "SWORD FORGE" in the top band using Cinzel.

Pause there and show me before continuing.
