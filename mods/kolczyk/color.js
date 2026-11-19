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

export function swatchName(name) {
  if (name === 'Gold') return 'Amber';
  if (name === 'Slate') return 'Gray';
  return name;
}

export function swatchColor(name, surface) {
  const swatch = SWATCHES.find(([label]) => label === swatchName(name));
  if (!swatch) return undefined;
  const [, dark, light] = swatch;
  const base = luminance(surface);
  const contrast = color => {
    const value = luminance(color);
    return (Math.max(value, base) + 0.05) / (Math.min(value, base) + 0.05);
  };
  const color = contrast(dark) >= contrast(light) ? dark : light;
  if (contrast(color) >= 3) return color;
  const target = contrast('#000000') >= contrast('#ffffff') ? 0 : 255;
  for (let step = 1; step <= 10; step++) {
    const blend = '#' + [1, 3, 5].map(i => {
      const channel = parseInt(color.slice(i, i + 2), 16);
      return Math.round(channel + (target - channel) * step / 10).toString(16).padStart(2, '0');
    }).join('');
    if (contrast(blend) >= 3) return blend;
  }
  return color;
}
