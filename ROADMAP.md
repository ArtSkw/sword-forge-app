# Gustav's Forge — v2 Rendering Roadmap

A prioritized plan for the next tier of visual improvements to the 3D sword model.
Items are ordered by impact-to-effort ratio within each tier.

---

## Tier 1 — High Impact, Low Complexity

### 1.1 Blade Normal Map Upgrade
**File:** `src/components/scene/Blade.tsx`

Upgrade the current 64×64 random-grain normal map to a 512×512 procedural map with:
- Directional grind lines running along the blade length (horizontal streaks)
- Finer, tighter grain near the edge, coarser near the fuller
- Separate edge bevel normal so each edge catches light as a distinct bright line

**Expected result:** Blade reads as real dressed steel under directional forge light.

---

### 1.2 Positional Roughness Variation
**File:** `src/components/scene/Blade.tsx`

Replace the single roughness constant per finish with a UV-driven roughness gradient:
- Ricasso (near guard) — slightly duller, shows handling wear
- Mid-blade — polished, specular highlight zone
- Edge — near-zero roughness for maximum sharpness

Achieved by encoding a 1D gradient into a canvas roughness map using existing UV coords.

**Expected result:** Blade looks polished where it should be and dull where it wears.

---

### 1.3 Finish-Specific Blade Color Gradient
**File:** `src/components/scene/Blade.tsx` + `src/components/scene/Sword.tsx`

For `battleWorn` and `ancient` finishes, apply a UV-based color gradient instead of a flat color:
- Dark / patinated at the base (near guard)
- Lighter, more polished toward the tip
- Edge zone slightly brighter than the flat

**Expected result:** Aging reads as authentic and positional rather than a uniform tint.

---

## Tier 2 — Medium Impact, Moderate Complexity

### 2.1 Grip Texture Normal Map
**File:** `src/components/scene/Grip.tsx`

Add a tiled canvas normal map to both the grip core cylinder and cord helices:
- Leather grain for the core (subtle diagonal fiber pattern)
- Braided cord micro-surface for the TubeGeometry wrap

**Expected result:** Grip has tactile surface believability instead of perfectly smooth surfaces.

---

### 2.2 Blade Edge Geometry Sharpening
**File:** `src/components/scene/Blade.tsx` + `src/presets/bladeProfiles.ts`

Add a narrow flat bevel face at each blade edge in the cross-section profile:
- Two extra vertices per edge in the profile ring
- Creates a thin specular highlight face that catches directional light as a bright line along the full blade length

**Expected result:** The defining visual of a real sword — a sharp bright edge line — becomes visible.

---

### 2.3 Gem Refraction via MeshPhysicalMaterial
**File:** `src/components/scene/Pommel.tsx`

Replace `MeshStandardMaterial` on gems with `MeshPhysicalMaterial`:
- `transmission: 0.9` — light passes through the stone
- `ior: 1.76` — refractive index of corundum (ruby/sapphire)
- `thickness: 0.008` — depth for absorption
- `roughness: 0.02` — near-perfect facet polish

**Expected result:** Gems glow with genuine internal light refraction rather than flat emissive color.

---

### 2.4 Ambient Occlusion Detail
**Files:** `src/components/scene/Blade.tsx`, `Crossguard.tsx`, `Grip.tsx`

Bake positional AO as a canvas texture or vertex color:
- Blade base darkened where it enters the crossguard slot
- Inside crossguard scroll terminals and ornate details
- Cord wrap overlaps on the grip core

**Expected result:** Depth and shadow where surfaces meet — removes the "floating parts" feel.

---

## Tier 3 — High Complexity, Transformative Results

### 3.1 MeshPhysicalMaterial for the Blade
**File:** `src/components/scene/Blade.tsx`

Upgrade blade material from `MeshStandardMaterial` to `MeshPhysicalMaterial`:
- `clearcoat: 0.3–0.6` — thin oil/polish layer on pristine/used finishes (0 on ancient)
- `clearcoatRoughness: 0.05–0.15` — controls sharpness of the clearcoat reflection
- `iridescence: 0.1–0.2` — subtle spectral shimmer at edge zones (heat-treat rainbow)

Tie values to the existing `BladeFinish` variants so pristine gets full clearcoat, ancient gets none.

**Expected result:** Pristine blades look exhibition-quality; ancient blades look genuinely dead and corroded.

---

### 3.2 Procedural Scratch/Wear Mask for battleWorn & ancient
**File:** `src/components/scene/Blade.tsx`

Generate a canvas scratch mask at runtime:
- Thin random streaks oriented along the blade length (grinding direction)
- Heavier density near the edge and tip (impact zones)
- Composite into roughness map: base roughness + mask elevation

**Expected result:** `battleWorn` and `ancient` finishes show real surface damage, not just higher roughness.

---

### 3.3 Fuller Light-Catch Normal
**File:** `src/components/scene/Blade.tsx` + `src/presets/bladeProfiles.ts`

Build a fuller-specific normal map channel that follows the groove profile:
- Sharp outward normals at the fuller rim (catches rim light)
- Inward normals at the channel base (shadows the channel floor)
- Blended into the existing normal map only in the fuller UV zone

**Expected result:** The fuller reads as a physically distinct groove with its own light response, not just a surface dent.

---

## Reference — Current State (v1 Baseline)

| Component | Material | Textures | Notes |
|-----------|----------|----------|-------|
| Blade | MeshStandardMaterial, metalness 1.0, roughness 0.15–0.65 | 64×64 noise normal map | 48-segment swept profile, 4 finish variants |
| Crossguard | MeshStandardMaterial, metalness 1.0, roughness 0.42 | None | Parametric swept octagon |
| Grip | MeshStandardMaterial, metalness 0, roughness 0.88 | None | Helical cord TubeGeometry |
| Pommel | MeshStandardMaterial, metalness 1.0, roughness 0.36 | None | LatheGeometry, 8-facet gem |
| Gems | MeshStandardMaterial, emissive, flatShading | None | 8-facet brilliant cut |
| Lighting | 2 animated point lights + 2 directional | — | Flicker + env rotation |
