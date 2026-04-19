import { useState } from 'react';
import { tokens } from '../../../styles/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

const BORDER: Record<ButtonVariant, string> = {
  primary:     tokens.color.borderAccent,
  secondary:   tokens.color.borderSubtle,
  destructive: tokens.color.accentCrimson,
};

const BORDER_HOVER: Record<ButtonVariant, string> = {
  primary:     tokens.color.borderAccentBright,
  secondary:   tokens.color.borderAccent,
  destructive: tokens.color.accentCrimson,
};

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const border = `1px solid ${hovered && !disabled ? BORDER_HOVER[variant] : BORDER[variant]}`;
  const boxShadow = hovered && !disabled && variant !== 'destructive'
    ? tokens.shadow.brassGlow
    : 'none';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border,
        borderRadius: tokens.radius.sharp,
        padding: '10px 20px',
        fontFamily: tokens.font.display,
        fontSize: 11,
        letterSpacing: tokens.letterSpacing.display,
        textTransform: 'uppercase',
        color: disabled ? tokens.color.textMuted : tokens.color.textPrimary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow,
        transition: 'border-color 0.15s, box-shadow 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
