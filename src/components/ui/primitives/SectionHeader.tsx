import { tokens } from '../../../styles/tokens';

type SectionHeaderProps = { label: string };

export function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span
        style={{
          fontFamily: tokens.font.display,
          fontSize: 11,
          letterSpacing: tokens.letterSpacing.display,
          textTransform: 'uppercase',
          color: tokens.color.textSecondary,
          paddingBottom: 4,
          borderBottom: `1px solid ${tokens.color.borderAccent}`,
          display: 'inline-block',
        }}
      >
        {label}
      </span>
    </div>
  );
}
