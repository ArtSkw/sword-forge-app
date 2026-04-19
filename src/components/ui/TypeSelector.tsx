import { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { useConfigStore, type ArchetypeKey } from '../../store/configStore';
import { SWORD_TYPES, SWORD_TYPE_ORDER } from '../../presets/swordTypes';


type CornerBracketProps = { corner: 'tl' | 'br' };

function CornerBracket({ corner }: CornerBracketProps) {
  const isTL = corner === 'tl';
  const pos = isTL
    ? { top: 4, left: 4 }
    : { bottom: 4, right: 4 };
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      style={{ position: 'absolute', ...pos }}
      aria-hidden="true"
    >
      <path
        d={isTL ? 'M 0,7 L 0,0 L 7,0' : 'M 7,0 L 7,7 L 0,7'}
        stroke={tokens.color.borderAccent}
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
}

type TypeCardProps = {
  archetypeKey: ArchetypeKey;
  isSelected: boolean;
  onClick: () => void;
};

function TypeCard({ archetypeKey, isSelected, onClick }: TypeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const preset = SWORD_TYPES[archetypeKey];

  const borderColor = isSelected
    ? tokens.color.borderAccentBright
    : isHovered
    ? tokens.color.borderAccent
    : tokens.color.borderSubtle;

  const boxShadow = isSelected
    ? `inset 0 0 24px rgba(201, 169, 97, 0.1), ${tokens.shadow.panel}`
    : tokens.shadow.panel;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={preset.description}
      style={{
        position: 'relative',
        width: 120,
        height: 140,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 8px 10px',
        background: `linear-gradient(to bottom, ${tokens.color.bgPanel}, ${tokens.color.bgDeep})`,
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        cursor: 'pointer',
        boxShadow,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {isHovered && !isSelected && (
        <>
          <CornerBracket corner="tl" />
          <CornerBracket corner="br" />
        </>
      )}
      <div
        style={{
          padding: 1,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #2A1E10 0%, #3D2C18 35%, #4A3820 50%, #3D2C18 65%, #2A1E10 100%)',
        }}
      >
        <div style={{ background: tokens.color.bgPanel, borderRadius: 2 }}>
          <img
            src={`/sword-icons/${archetypeKey}.png`}
            alt={preset.name}
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>
      <span
        style={{
          fontFamily: tokens.font.display,
          fontSize: 10,
          letterSpacing: tokens.letterSpacing.display,
          textTransform: 'uppercase',
          color: isSelected ? tokens.color.textPrimary : tokens.color.textSecondary,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {preset.name}
      </span>
    </button>
  );
}

export function TypeSelector() {
  const config = useConfigStore((s) => s.config);
  const setArchetype = useConfigStore((s) => s.setArchetype);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 10,
        overflowX: 'auto',
        maxWidth: 'calc(100vw - 48px)',
        paddingBottom: 4,
        animation: 'cc-reveal 0.9s ease 2.2s both',
      }}
    >
      {SWORD_TYPE_ORDER.map((key) => (
        <TypeCard
          key={key}
          archetypeKey={key}
          isSelected={config.archetype === key}
          onClick={() => setArchetype(key)}
        />
      ))}
    </div>
  );
}
