import type { ArchetypeKey } from '../../store/configStore';
import { HILT_DETAIL_RECIPES } from '../../presets/archetypeDetails';

type HiltDetailsProps = {
  archetype: ArchetypeKey;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  guardY: number;
  gripTopY: number;
  gripBottomY: number;
};

export function HiltDetails({ archetype, color, emissive, emissiveIntensity, roughness, guardY, gripTopY, gripBottomY }: HiltDetailsProps) {
  const recipe = HILT_DETAIL_RECIPES[archetype];
  const metalRoughness = Math.max(0.32, roughness - 0.06);
  const anchorY = {
    guardCollar: guardY,
    topSpacer: gripTopY - recipe.spacerHeight * 0.5,
    bottomSpacer: gripBottomY + recipe.spacerHeight * 0.5,
  };
  const material = (
    <meshStandardMaterial
      color={color}
      metalness={1}
      roughness={metalRoughness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );

  return (
    <>
      <mesh position={[0, guardY, 0]} scale={[1, 0.72, recipe.guardCollarScaleZ]}>
        <cylinderGeometry args={[recipe.guardCollarRadiusTop, recipe.guardCollarRadiusBottom, recipe.guardCollarHeight, 32]} />
        {material}
      </mesh>
      <mesh position={[0, gripTopY - recipe.spacerHeight * 0.5, 0]}>
        <cylinderGeometry args={[recipe.topSpacerRadiusTop, recipe.topSpacerRadiusBottom, recipe.spacerHeight, 32]} />
        {material}
      </mesh>
      <mesh position={[0, gripBottomY + recipe.spacerHeight * 0.5, 0]}>
        <cylinderGeometry args={[recipe.bottomSpacerRadiusTop, recipe.bottomSpacerRadiusBottom, recipe.spacerHeight, 32]} />
        {material}
      </mesh>
      {recipe.decorativeBands?.map((band, index) => (
        <mesh
          key={`${band.anchor}-${index}`}
          position={[0, anchorY[band.anchor] + (band.offsetY ?? 0), 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[band.radius, band.tube, 6, 40]} />
          {material}
        </mesh>
      ))}
      {recipe.parryingLugs && (
        <>
          <mesh
            position={[-recipe.parryingLugs.length / 2, guardY + recipe.parryingLugs.offsetY, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1, 1, 0.72]}
          >
            <cylinderGeometry
              args={[
                recipe.parryingLugs.tipRadius,
                recipe.parryingLugs.baseRadius,
                recipe.parryingLugs.length,
                18,
              ]}
            />
            {material}
          </mesh>
          <mesh
            position={[recipe.parryingLugs.length / 2, guardY + recipe.parryingLugs.offsetY, 0]}
            rotation={[0, 0, -Math.PI / 2]}
            scale={[1, 1, 0.72]}
          >
            <cylinderGeometry
              args={[
                recipe.parryingLugs.tipRadius,
                recipe.parryingLugs.baseRadius,
                recipe.parryingLugs.length,
                18,
              ]}
            />
            {material}
          </mesh>
        </>
      )}
    </>
  );
}
