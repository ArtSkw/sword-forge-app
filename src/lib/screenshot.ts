// Blur radius matches the CSS applied to the background <video> element in AppShell.
const BG_BLUR_PX = 10;

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sword-forge-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function takeScreenshot(): Promise<void> {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const W = canvas.width;
  const H = canvas.height;

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  if (!ctx) return;

  let backgroundDrawn = false;
  try {
    const bg = new Image();
    bg.src = `${import.meta.env.BASE_URL}background.webp`;
    await bg.decode();

    ctx.filter = `blur(${BG_BLUR_PX}px)`;
    const scale = Math.max(W / bg.width, H / bg.height);
    const drawW = bg.width * scale;
    const drawH = bg.height * scale;
    ctx.drawImage(bg, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
    ctx.filter = 'none';
    backgroundDrawn = true;
  } catch {
    // Fall back to solid near-black so the sword still composites cleanly
    ctx.fillStyle = '#050302';
    ctx.fillRect(0, 0, W, H);
  }

  if (backgroundDrawn) {
    // Dark vignette — matches body::after in globals.css (ellipse 55% 65% at 50% 48%)
    ctx.save();
    const cx = W * 0.5;
    const cy = H * 0.48;
    const rx = W * 0.55;
    const ry = H * 0.65;
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const radial = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    radial.addColorStop(0.0, 'rgba(3, 2, 1, 0.88)');
    radial.addColorStop(0.4, 'rgba(3, 2, 1, 0.62)');
    radial.addColorStop(0.7, 'rgba(3, 2, 1, 0.28)');
    radial.addColorStop(1.0, 'rgba(3, 2, 1, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(-cx / rx, -cy / ry, W / rx, H / ry);
    ctx.restore();

    const linear = ctx.createLinearGradient(0, 0, 0, H);
    linear.addColorStop(0.00, 'rgba(3, 2, 1, 0.55)');
    linear.addColorStop(0.25, 'rgba(3, 2, 1, 0)');
    linear.addColorStop(0.72, 'rgba(3, 2, 1, 0)');
    linear.addColorStop(1.00, 'rgba(3, 2, 1, 0.65)');
    ctx.fillStyle = linear;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.drawImage(canvas, 0, 0, W, H);

  out.toBlob((blob) => {
    if (blob) download(blob);
  }, 'image/png');
}
