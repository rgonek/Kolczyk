const hexPattern = /^#[a-f0-9]{6}$/i;
const clamp = v => Math.max(0, Math.min(1, v));
const channel = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
export function luminance(hex) {
  if (typeof hex !== 'string' || !hexPattern.test(hex)) return 0;
  const n = parseInt(hex.slice(1), 16);
  return channel(n >> 16) * 0.2126 + channel((n >> 8) & 255) * 0.7152 + channel(n & 255) * 0.0722;
}
export function contrastBacking(foreground, background) {
  if (typeof foreground !== 'string' || typeof background !== 'string' || !hexPattern.test(foreground) || !hexPattern.test(background)) return null;
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
  if (typeof hex !== 'string' || !hexPattern.test(hex)) return { h: 260, s: 0.5, v: 0.9 };
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = !delta ? 0 : max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return { h: (h + 360) % 360, s: max ? delta / max : 0, v: max };
}

// T3 Code project hues use Tailwind shades 600, 400 and 500 for light, dark and swatches.
export const SWATCHES = [
  ['Gray', '#4a5565', '#99a1af', '#6a7282'],
  ['Red', '#e7000b', '#ff6467', '#fb2c36'],
  ['Orange', '#f54900', '#ff8904', '#ff6900'],
  ['Amber', '#e17100', '#ffb900', '#fe9a00'],
  ['Yellow', '#d08700', '#fdc700', '#f0b100'],
  ['Lime', '#5ea500', '#9ae600', '#7ccf00'],
  ['Green', '#00a63e', '#05df72', '#00c950'],
  ['Emerald', '#009966', '#00d492', '#00bc7d'],
  ['Teal', '#009689', '#00d5be', '#00bba7'],
  ['Cyan', '#0092b8', '#00d3f2', '#00b8db'],
  ['Sky', '#0084d1', '#00bcff', '#00a6f4'],
  ['Blue', '#155dfc', '#51a2ff', '#2b7fff'],
  ['Indigo', '#4f39f6', '#7c86ff', '#615fff'],
  ['Violet', '#7f22fe', '#a684ff', '#8e51ff'],
  ['Purple', '#9810fa', '#c27aff', '#ad46ff'],
  ['Fuchsia', '#c800de', '#ed6aff', '#e12afb'],
  ['Pink', '#e60076', '#fb64b6', '#f6339a'],
  ['Rose', '#ec003f', '#ff637e', '#ff2056'],
];

const SWATCH_MAP = new Map(SWATCHES.map(entry => [entry[0], entry]));
const swatchCache = new Map();

export function swatchName(name) {
  if (name === 'Gold') return 'Amber';
  if (name === 'Slate') return 'Gray';
  return name;
}

export function swatchColor(name, surface) {
  const label = swatchName(name);
  const swatch = SWATCH_MAP.get(label);
  if (!swatch) return undefined;
  const key = `${label}\0${surface ?? ''}`;
  const cached = swatchCache.get(key);
  if (cached !== undefined) return cached;
  const [, dark, light] = swatch;
  const base = luminance(surface);
  const ratio = value => (Math.max(value, base) + 0.05) / (Math.min(value, base) + 0.05);
  const darkContrast = ratio(luminance(dark));
  const lightContrast = ratio(luminance(light));
  const color = darkContrast >= lightContrast ? dark : light;
  let result = color;
  if (Math.max(darkContrast, lightContrast) < 3) {
    const target = ratio(0) >= ratio(1) ? 0 : 255;
    const n = parseInt(color.slice(1), 16);
    const r0 = n >> 16, g0 = (n >> 8) & 255, b0 = n & 255;
    for (let step = 1; step <= 10; step++) {
      const r = Math.round(r0 + (target - r0) * step / 10);
      const g = Math.round(g0 + (target - g0) * step / 10);
      const b = Math.round(b0 + (target - b0) * step / 10);
      if (ratio(channel(r) * 0.2126 + channel(g) * 0.7152 + channel(b) * 0.0722) >= 3) {
        result = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
        break;
      }
    }
  }
  if (swatchCache.size > 512) swatchCache.clear();
  swatchCache.set(key, result);
  return result;
}
