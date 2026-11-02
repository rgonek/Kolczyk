const clamp = v => Math.max(0, Math.min(1, v));
export function luminance(hex) {
  if (!/^#[a-f0-9]{6}$/i.test(hex ?? '')) return 0;
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function contrastBacking(foreground, background) {
  if (!/^#[a-f0-9]{6}$/i.test(foreground ?? '') || !/^#[a-f0-9]{6}$/i.test(background ?? '')) return null;
  const a = luminance(foreground), b = luminance(background);
  if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3) return null;
  return (a + 0.05) / 0.05 >= 1.05 / (a + 0.05) ? '#000000' : '#ffffff';
}
export function hsvToHex(h, s, v) {
  h = ((h % 360) + 360) % 360; s = clamp(s); v = clamp(v);
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('');
}
export function hexToHsv(hex) {
  if (!/^#[a-f0-9]{6}$/i.test(hex ?? '')) return { h: 260, s: 0.5, v: 0.9 };
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = !delta ? 0 : max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return { h: (h + 360) % 360, s: max ? delta / max : 0, v: max };
}
