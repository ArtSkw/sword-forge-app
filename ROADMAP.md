# Sword Forge — Production-Style 3D Roadmap

This roadmap is the active development plan for raising Sword Forge from a
good interactive prototype into a medieval/fantasy game-like sword generator.
The goal is not CAD precision or a Blender-style asset pipeline. The goal is a
feasible **procedural game-asset pipeline** inside the current Codex + Vite +
React Three Fiber project.

The core rule: keep the sword parametric, but improve it in layers —
geometry first, then materials, then controls, then cinematic presentation.

---

## Target Quality

The app should produce screenshot-worthy swords that feel like inspectable RPG
weapon assets:

- distinct historical/fantasy archetypes, not just resized versions of one mesh
- believable blade geometry with proper taper, fullers, bevels, and cross-sections
- fittings that feel built from parts: guard, collars, grip, pommel, rivets, terminals
- material response that reads as steel, brass/bronze, leather, wood, and cord
- finish/condition changes that affect the whole sword coherently
- cinematic lighting, atmosphere, and camera framing

We will avoid broad, fake procedural texture patterns unless the UV strategy
supports them cleanly. Subtle surface response is better than noisy detail.

---

## Current Baseline

Implemented foundations:

- 7 archetypes: arming sword, longsword, bastard sword, Viking sword, falchion, estoc, greatsword
- Zustand config store and Leva controls
- full-screen R3F scene with orbit controls, animated forge lighting, environment reflections
- video/audio atmosphere, cling sounds, export config, screenshot capture
- per-archetype blade body taper fields:
  - `bodyTaperEnd`
  - `bodyTaperMidWidth`
  - `tipShoulderRound`
  - `crossSection`
  - `edgeBow`
  - `spineClipT`
- blade cross-section families:
  - lenticular
  - diamond
  - hexagonal
- Viking-specific broad fuller profile for the lenticular single-fuller blade
- improved blade mesh:
  - 144 longitudinal segments
  - explicit smooth tangent-based normals for blade taper and tip highlights
  - secondary edge bevels
  - directional steel-grain normal map
  - `MeshPhysicalMaterial` blade shader
- finish now affects the whole sword at a basic level:
  - blade color and physical response
  - hardware color/roughness
  - grip darkening/roughness
- Viking default reset to `Used + Steel` rather than `Ancient + Darkened`

Known rough edges:

- `steelFinish` and `hardwareTone` are now separate controls, but the material
  recipes are still simple color/roughness tables
- guard and pommel styles are still mostly generic rather than archetype-authored
- grip has good helical geometry, but weak material detail
- collars, spacers, and guard terminal options now exist as archetype recipes,
  but the decorative language is still conservative
- postprocessing component exists but is not yet part of the active scene
- lint currently has Fast Refresh / React hook rule issues from existing structure

---

## Pipeline Principles

1. **Geometry Before Texture**
   If a feature changes silhouette or catches light at asset scale, model it as
   geometry. Examples: collars, bevels, fuller lips, pommel rims, guard terminals.

2. **Subtle Procedural Materials**
   Use procedural maps for fine-grain response only: brushed steel, leather grain,
   roughness variation, tiny scratches. Avoid large blocky color maps.

3. **Global Condition, Local Materials**
   A sword should not have an ancient blade with pristine hardware unless that is
   a deliberate special mode. Condition should affect blade, fittings, and grip.

4. **Hero Pass, Then Generalize**
   Upgrade one archetype end-to-end before broadening the system. Viking is first
   because it has obvious historical identity and strong visual references.

5. **Stay In-Repo**
   Prefer TypeScript, Three.js geometry, generated canvas textures, and existing
   assets. No dependency on Blender, Substance, external modeling tools, or paid
   asset pipelines for the planned work.

---

## Milestone 1 — Control Model Refactor

**Goal:** make controls match the actual mental model before adding more detail.

Current status: the practical refactor is complete. `finish.blade` has become
`finish.condition`, the exported type is now `SwordCondition`, and the old
overloaded `metalTone` control has been split into `steelFinish` and
`hardwareTone`.

Suggested config direction:

```ts
finish: {
  condition: 'pristine' | 'used' | 'battleWorn' | 'ancient';
  steelFinish: 'polished' | 'satin' | 'darkened' | 'patternWelded';
  hardwareTone: 'steel' | 'brass' | 'bronze' | 'darkIron';
  gripColor: string;
}
```

Practical first step:

- ✅ rename `finish.blade` to `finish.condition`
- ✅ rename `BladeFinish` to `SwordCondition`
- ✅ relabel Leva UI from `Blade` to `Condition`
- ✅ split `metalTone` into `steelFinish` and `hardwareTone`

Files:

- `src/store/configStore.ts`
- `src/components/ui/ControlPanel.tsx`
- `src/components/scene/Sword.tsx`
- `src/presets/swordTypes.ts`
- `src/lib/exportConfig.ts`

Acceptance criteria:

- user can understand the controls without guessing
- condition affects the whole sword
- existing presets still load correctly

---

## Milestone 2 — Hero Viking Sword Quality Pass

**Goal:** use Viking as the first production-style benchmark.

Viking should read closer to references: broad bright steel blade, wide fuller,
near-parallel edges, short rounded tip, compact guard, darker grip, brazil-nut
pommel, and warm bronze/brass hardware options.

Work items:

- tune Viking proportions:
  - ✅ blade width and fuller width
  - shoulder/tip roundness
  - ✅ guard length/thickness
  - ✅ grip and pommel scale
- add Viking-specific fittings:
  - ✅ short chunky guard
  - ✅ brazil-nut pommel refinement
  - optional bronze/brass hardware tone
  - ✅ small collars/spacers at grip ends
- add subtle Viking blade detail:
  - clean steel default
  - ✅ optional pattern-welded steel as a controlled `steelFinish`
  - ✅ remove iridescent color banding from ordinary steel
  - avoid noisy aged blade color maps
- adjust default preset:
  - condition: `used`
  - steel/hardware: bright steel or bronze fittings
  - grip: dark leather/wood tone

Files:

- `src/presets/swordTypes.ts`
- `src/components/scene/Sword.tsx`
- `src/components/scene/Blade.tsx`
- `src/components/scene/Crossguard.tsx`
- `src/components/scene/Pommel.tsx`
- `src/components/scene/Grip.tsx`

Acceptance criteria:

- Viking is recognizable at a glance
- blade stays bright steel, not black or muddy
- fittings and grip visually belong to the same condition
- no large artificial texture bands

---

## Milestone 3 — Modular Construction Details

**Goal:** make all swords feel assembled from real parts.

Add reusable procedural modules:

- ✅ guard-side collars / langets
- ✅ grip-end spacers
- ✅ recipe-driven pommel rivets or caps
- ✅ recipe-driven guard terminal caps
- ✅ optional wire rings around grip
- ✅ simple decorative bands for ornate/fantasy variants

Files:

- new `src/presets/archetypeDetails.ts`
- new `src/components/scene/HiltDetails.tsx`
- `src/components/scene/Crossguard.tsx`
- `src/components/scene/Pommel.tsx`
- `src/components/scene/Grip.tsx`

Acceptance criteria:

- hilt no longer looks like four primitives touching
- transitions between blade, guard, grip, and pommel have depth
- details are reusable across archetypes

---

## Milestone 4 — Archetype Identity Pass

**Goal:** each sword should be identifiable from silhouette and fittings.

Per-archetype improvements:

- **Arming sword:** ✅ reference pass started: longer fuller, black banded grip,
  wheel pommel, mild straight-guard arc, balanced medium taper
- **Longsword:** ✅ reference pass started: longer fuller, longer straight guard,
  dark brown banded two-hand grip, scent-stopper pommel, cleaner knightly profile
- **Bastard sword:** ✅ reference pass started: hand-and-a-half black banded
  grip, pronounced curved guard, long fuller, fluted fishtail pommel
- **Viking sword:** broad blade, wide fuller, compact guard, brazil-nut pommel
- **Falchion:** ✅ reference pass started: strong single-edged belly, clipped
  point, short curved guard, black banded grip, muted disc pommel
- **Estoc:** ✅ reference pass started: narrow diamond needle profile, slim
  straight guard with ball terminals, dark ringed grip, compact wheel pommel
- **Greatsword:** ✅ reference pass started: extra-long hexagonal blade, double
  fuller, black banded two-hand grip, broad curved guard, parrying lugs, fluted
  fishtail pommel

Files:

- `src/presets/swordTypes.ts`
- `src/presets/bladeProfiles.ts`
- `src/presets/pommelProfiles.ts`
- `src/components/scene/Crossguard.tsx`
- `src/components/scene/Sword.tsx`

Acceptance criteria:

- switching archetypes changes identity, not only size
- presets feel historically/plausibly distinct
- custom controls still let the user explore variants

---

## Milestone 5 — Material System Pass

**Goal:** make material changes believable without fake texture noise.

Planned material controls:

- **Condition:** Pristine / Used / Battle-Worn / Ancient
- **Steel Finish:** Polished / Satin / Darkened / Pattern-Welded
- **Hardware Tone:** Steel / Brass / Bronze / Dark Iron
- **Grip Material:** Leather / Wood / Cord / Wire-Wrapped

Implementation ideas:

- shared material recipe tables in a dedicated module
- blade physical parameters stay in `Blade.tsx` or move to `src/styles/materials.ts`
- small generated normal maps:
  - brushed steel grain
  - leather grain
  - wood grain
  - cord fibers
- condition affects:
  - metal roughness
  - clearcoat
  - base color darkening
  - grip darkening
  - hardware roughness

Avoid for now:

- broad color-map weathering
- random rectangular stains
- high-contrast procedural dirt without UV discipline

Acceptance criteria:

- pristine looks clean and sharp
- used looks handled but maintained
- battle-worn looks rougher/duller but still metal
- ancient looks aged, not painted black or chalky

---

## Milestone 6 — Surface Detail Pass

**Goal:** add high-frequency detail in places where it helps.

Work items:

- leather grain normal map for grip core
- cord/wire normal or geometry refinement
- subtle blade roughness gradient:
  - duller ricasso/base
  - cleaner mid-blade
  - sharper edge highlights
- tiny edge nicks for battle-worn/ancient as sparse geometry or very subtle masks
- ambient occlusion at part intersections:
  - blade entering guard
  - grip under collars
  - pommel cap/rivet

Acceptance criteria:

- close views reward inspection
- details do not look like UI-generated patterns
- performance remains smooth

---

## Milestone 7 — Cinematic Rendering Pass

**Goal:** make the scene feel more like a game weapon preview.

Work items:

- mount `Postprocessing.tsx`
- tune bloom without washing out steel
- add subtle vignette and film grain
- consider depth of field focused on sword centroid
- set/tune renderer tone mapping and exposure
- improve environment/reflection setup
- add optional dust motes once main sword read is strong

Files:

- `src/components/scene/Scene.tsx`
- `src/components/scene/Postprocessing.tsx`
- `src/components/scene/Lighting.tsx`
- `src/styles/globals.css`

Acceptance criteria:

- blade reflections look controlled
- hilt remains readable against background
- screenshots feel cinematic without hiding model flaws

---

## Milestone 8 — UI, Export, And Performance

Lower priority, but useful once model quality improves:

- quality toggle: low / medium / high
- share URL with encoded config
- saved gallery in LocalStorage
- code-split heavy Three/postprocessing modules
- import config from JSON
- polish screenshot capture for high-resolution output

---

## Suggested Execution Order

1. **Control Model Refactor**
2. **Hero Viking Sword Quality Pass**
3. **Modular Construction Details**
4. **Archetype Identity Pass**
5. **Material System Pass**
6. **Surface Detail Pass**
7. **Cinematic Rendering Pass**
8. **UI, Export, And Performance**

Work in small increments. After each milestone, visually review the app before
continuing.

---

## Development Notes

- Keep edits scoped and reversible.
- Prefer named constants for proportions and material values.
- Use generated canvas textures only for subtle surface response.
- Avoid large procedural texture patterns until UVs are intentionally designed.
- Run `npm run build` after meaningful code changes.
- Use browser screenshots for visual QA when WebGL capture works in the current environment.
