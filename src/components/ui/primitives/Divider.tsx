import { tokens } from '../../../styles/tokens';

export function Divider() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        margin: '16px 0',
      }}
    >
      <div style={{ flex: 1, height: 1, background: tokens.color.borderSubtle }} />
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        style={{ margin: '0 8px', flexShrink: 0 }}
        aria-hidden="true"
      >
        <polygon
          points="6,1 11,6 6,11 1,6"
          fill={tokens.color.borderAccent}
        />
      </svg>
      <div style={{ flex: 1, height: 1, background: tokens.color.borderSubtle }} />
    </div>
  );
}
