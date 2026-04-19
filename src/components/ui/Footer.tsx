import { useState } from 'react';
import { Button } from './primitives/Button';
import { takeScreenshot } from '../../lib/screenshot';
import { exportConfig } from '../../lib/exportConfig';
import { useConfigStore } from '../../store/configStore';
import { tokens } from '../../styles/tokens';

export function Footer() {
  const config        = useConfigStore((s) => s.config);
  const bumpResetTick = useConfigStore((s) => s.bumpResetTick);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    await exportConfig(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Reset View — bottom-left, clear of the type selector */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          zIndex: 10,
          animation: 'cc-rise 0.8s ease 2.6s both',
        }}
      >
        <Button label="Reset View" variant="secondary" onClick={bumpResetTick} />
      </div>

      {/* Export + Screenshot — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 10,
          animation: 'cc-rise 0.8s ease 2.6s both',
        }}
      >
        {copied && (
          <span
            style={{
              fontFamily: tokens.font.mono,
              fontSize: 11,
              color: tokens.color.borderAccentBright,
              letterSpacing: '0.05em',
            }}
          >
            Configuration copied
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button label="Export" variant="secondary" onClick={handleExport} />
          <Button label="Screenshot" onClick={takeScreenshot} />
        </div>
      </div>
    </>
  );
}
