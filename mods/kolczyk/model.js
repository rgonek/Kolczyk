// Pure model shared by native views and tests. No app/runtime dependencies.
export const COLORS = ['#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#a3e635', '#facc15', '#fb923c', '#f87171', '#f472b6', '#ffffff', '#94a3b8', '#18181b'];
export const EMOJIS = ['🐑', '🐏', '💻', '🛠️', '🚀', '🤖', '✨', '⚡', '🌐', '📱', '🖥️', '⌨️', '⚙️', '🗄️', '☁️', '📦', '📚', '🧪', '🔒', '🎮', '🎵', '🎬', '🖼️', '🛍️', '🔥', '💡', '🧩', '📊', '🧠', '🦄', '🐙', '🌱'];
export const POPULAR = ['folder-code', 'code', 'terminal', 'globe', 'server', 'database', 'bot', 'sparkles', 'smartphone', 'monitor', 'cloud-cog', 'package', 'book-open', 'flask-conical', 'shield-check', 'rocket', 'gamepad-2', 'music', 'image', 'shopping-bag', 'git-branch', 'workflow', 'wrench', 'layers', 'heart', 'star', 'coffee', 'paw-print', 'leaf', 'gem'];
const hex = /^#[a-f0-9]{6}$/i;

export function monogram(name) {
  const parts = String(name || '?').normalize('NFKC').trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!parts.length) return '?';
  const first = [...parts[0]];
  return (parts.length > 1 ? first[0] + [...parts[1]][0] : first[0] + (first.length > 1 ? first.at(-1) : '')).toUpperCase();
}

export function draftFor(value, name) {
  return {
    kind: 'auto', library: 'lucide', name: 'folder-code', emoji: '🐑', text: monogram(name),
    color: '#a78bfa', background: null, shape: 'rounded', image: null,
    ...(value && typeof value === 'object' ? value : {}),
    emojiOffsets: Object.fromEntries(Object.entries(value?.emojiOffsets ?? {}).map(([emoji, offset]) => [emoji, { ...offset }])),
    adjustments: Object.fromEntries(Object.entries(value?.adjustments ?? {}).map(([key, a]) => [key, { ...a }])),
  };
}

export function firstEmoji(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  // QuickJS builds without Intl.Segmenter still preserve common ZWJ/flag/keycap sequences.
  const segment = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value?.segment
    : text.match(/^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*)*)/u)?.[0];
  return segment && (/\p{Extended_Pictographic}/u.test(segment) || /^\p{Regional_Indicator}{2}$/u.test(segment) || /^[#*0-9]\uFE0F?\u20E3$/u.test(segment)) ? segment : null;
}

export function validateDraft(d) {
  if (d.kind === 'herdr') return null;
  if (!['auto', 'lucide', 'emoji', 'monogram', 'image'].includes(d.kind)) return 'Choose an icon type.';
  if (['auto', 'lucide', 'monogram'].includes(d.kind) && !hex.test(d.color)) return 'Symbol color must be #RRGGBB.';
  if (d.background !== null && !hex.test(d.background)) return 'Background must be #RRGGBB, or choose None.';
  if (!['circle', 'square', 'rounded'].includes(d.shape)) return 'Choose a background shape.';
  if (d.kind === 'lucide' && !['lucide', 'feather', 'hugeicons'].includes(d.library ?? 'lucide')) return 'Choose an icon library.';
  if (Object.values(d.emojiOffsets ?? {}).some(o => !o || !Number.isInteger(o.x) || !Number.isInteger(o.y) || Math.abs(o.x) > 8 || Math.abs(o.y) > 8)) return 'Emoji offsets must be whole pixels between -8 and 8.';
  if (Object.values(d.adjustments ?? {}).some(o => !o || !Number.isInteger(o.x) || !Number.isInteger(o.y) || Math.abs(o.x) > 8 || Math.abs(o.y) > 8 || !Number.isInteger(o.scale) || o.scale < 50 || o.scale > 150)) return 'Use position -8 to 8 px and size 50–150%.';
  if (d.kind === 'lucide' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name)) return 'Choose a Lucide icon.';
  if (d.kind === 'monogram' && !/^[\p{L}\p{N}]{1,2}$/u.test(d.text.normalize('NFKC').trim().toUpperCase())) return 'Use one or two letters or numbers.';
  if (d.kind === 'emoji' && firstEmoji(d.emoji) !== d.emoji) return 'Paste one complete emoji.';
  if (d.kind === 'image' && !/^assets\/kolczyk\/[a-f0-9]+\.(svg|png)$/i.test(d.image ?? '')) return 'Choose and import an image first.';
  return null;
}

export function appearance(value, name, automatic, size = 24) {
  const d = draftFor(value, name);
  const defaults = draftFor(null, name);
  // An incomplete editor field must not replace the rest of the preview.
  // Sanitize the detached rendering copy; validation still blocks saving it.
  if (!hex.test(d.color)) d.color = defaults.color;
  if (d.background !== null && !hex.test(d.background)) d.background = defaults.background;
  if (!['circle', 'square', 'rounded'].includes(d.shape)) d.shape = defaults.shape;
  if (!['lucide', 'feather', 'hugeicons'].includes(d.library)) d.library = defaults.library;
  if (!['auto', 'lucide', 'emoji', 'monogram', 'image', 'herdr'].includes(d.kind)) d.kind = 'auto';
  if (d.kind === 'lucide' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name)) d.name = defaults.name;
  if (d.kind === 'emoji' && firstEmoji(d.emoji) !== d.emoji) d.emoji = defaults.emoji;
  if (typeof d.text !== 'string' || !/^[\p{L}\p{N}]{1,2}$/u.test(d.text.normalize('NFKC').trim().toUpperCase())) d.text = defaults.text;
  if (d.kind === 'image' && !/^assets\/kolczyk\/[a-f0-9]+\.(svg|png)$/i.test(d.image ?? '')) d.kind = 'auto';
  for (const [key, adjustment] of Object.entries(d.adjustments)) {
    if (!Number.isInteger(adjustment.x) || !Number.isInteger(adjustment.y) || Math.abs(adjustment.x) > 8 || Math.abs(adjustment.y) > 8 || !Number.isInteger(adjustment.scale) || adjustment.scale < 50 || adjustment.scale > 150) delete d.adjustments[key];
  }
  for (const [key, offset] of Object.entries(d.emojiOffsets)) {
    if (!Number.isInteger(offset.x) || !Number.isInteger(offset.y) || Math.abs(offset.x) > 8 || Math.abs(offset.y) > 8) delete d.emojiOffsets[key];
  }
  const kind = d.kind === 'auto' ? (automatic ? 'image' : 'monogram') : d.kind;
  const adjustment = d.adjustments[transformKey(d)] ?? { x: 0, y: 0, scale: 100 };
  const offset = d.kind === 'emoji' ? d.emojiOffsets[d.emoji] ?? { x: 0, y: 0 } : adjustment;
  return {
    kind, path: d.kind === 'auto' ? automatic : d.image, name: d.name, library: d.library,
    text: kind === 'emoji' ? d.emoji : d.kind === 'auto' ? monogram(name) : d.text.normalize('NFKC').trim().toUpperCase(),
    foreground: d.color, background: d.background,
    emojiX: (d.emojiOffsets[d.emoji]?.x ?? 0) * size / 22,
    emojiY: (d.emojiOffsets[d.emoji]?.y ?? 0) * size / 22,
    offsetX: offset.x * size / 22, offsetY: offset.y * size / 22, scale: adjustment.scale / 100,
    radius: d.shape === 'circle' ? size / 2 : d.shape === 'square' ? 0 : size * 0.24,
  };
}

export function transformKey(d) {
  return d.kind === 'lucide' ? `${d.library ?? 'lucide'}:${d.name}` : d.kind === 'emoji' ? `emoji:${d.emoji}` : d.kind === 'image' ? `image:${d.image ?? ''}` : d.kind;
}

export function filterIcons(names, query) {
  const needle = String(query).trim().toLowerCase().replace(/\s+/g, '-');
  return needle ? names.filter(name => name.includes(needle)) : POPULAR.filter(name => names.includes(name));
}
