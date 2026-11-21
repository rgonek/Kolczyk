// Pure model shared by native views and tests. No app/runtime dependencies.
export const EMOJIS = ['🐑', '🐏', '💻', '🛠️', '🚀', '🤖', '✨', '⚡', '🌐', '📱', '🖥️', '⌨️', '⚙️', '🗄️', '☁️', '📦', '📚', '🧪', '🔒', '🎮', '🎵', '🎬', '🖼️', '🛍️', '🔥', '💡', '🧩', '📊', '🧠', '🦄', '🐙', '🌱'];
export const POPULAR = ['folder-code', 'code', 'terminal', 'globe', 'server', 'database', 'bot', 'sparkles', 'smartphone', 'monitor', 'cloud-cog', 'package', 'book-open', 'flask-conical', 'shield-check', 'rocket', 'gamepad-2', 'music', 'image', 'shopping-bag', 'git-branch', 'workflow', 'wrench', 'layers', 'heart', 'star', 'coffee', 'paw-print', 'leaf', 'gem'];
const hex = /^#[a-f0-9]{6}$/i;
const ascii = /^[\x00-\x7f]*$/;
const asciiSep = /[^A-Za-z0-9]+/;
const asciiMonogram = /^[A-Z0-9]{1,2}$/;
const nonWord = /[^\p{L}\p{N}]+/u;
const iconName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const monogramText = /^[\p{L}\p{N}]{1,2}$/u;
const assetPath = /^assets\/kolczyk\/[a-f0-9]+\.(svg|png)$/i;
const emojiSeq = /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*)*)/u;
const hasPictographic = /\p{Extended_Pictographic}/u;
const isFlag = /^\p{Regional_Indicator}{2}$/u;
const isKeycap = /^[#*0-9]\uFE0F?\u20E3$/u;
const DEFAULT_OFFSET = { x: 0, y: 0 };
const DEFAULT_ADJUSTMENT = { x: 0, y: 0, scale: 100 };

const validOffset = o => Boolean(o && Number.isInteger(o.x) && Number.isInteger(o.y) && Math.abs(o.x) <= 8 && Math.abs(o.y) <= 8);
const validAdjustment = a => Boolean(validOffset(a) && Number.isInteger(a.scale) && a.scale >= 50 && a.scale <= 150);

export function monogram(name) {
  const raw = String(name || '?');
  if (ascii.test(raw)) {
    const parts = raw.trim().split(asciiSep).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0];
    return (parts.length > 1 ? first[0] + parts[1][0] : first[0] + (first.length > 1 ? first[first.length - 1] : '')).toUpperCase();
  }
  const parts = raw.normalize('NFKC').trim().split(nonWord).filter(Boolean);
  if (!parts.length) return '?';
  const first = [...parts[0]];
  return (parts.length > 1 ? first[0] + [...parts[1]][0] : first[0] + (first.length > 1 ? first.at(-1) : '')).toUpperCase();
}

export function draftFor(value, name) {
  const src = value && typeof value === 'object' ? value : null;
  const emojiOffsets = {};
  if (src?.emojiOffsets) {
    for (const [emoji, offset] of Object.entries(src.emojiOffsets)) emojiOffsets[emoji] = { ...offset };
  }
  const adjustments = {};
  if (src?.adjustments) {
    for (const [key, a] of Object.entries(src.adjustments)) adjustments[key] = { ...a };
  }
  return {
    kind: 'auto', library: 'lucide', name: 'folder-code', emoji: '🐑',
    text: src && 'text' in src ? src.text : monogram(name),
    color: '#a78bfa', background: null, shape: 'rounded', image: null,
    ...src,
    emojiOffsets,
    adjustments,
  };
}

export function firstEmoji(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  // QuickJS builds without Intl.Segmenter still preserve common ZWJ/flag/keycap sequences.
  const segment = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value?.segment
    : text.match(emojiSeq)?.[0];
  return segment && (hasPictographic.test(segment) || isFlag.test(segment) || isKeycap.test(segment)) ? segment : null;
}

export function validateDraft(d) {
  if (d.kind === 'herdr') return null;
  if (!['auto', 'lucide', 'emoji', 'monogram', 'image'].includes(d.kind)) return 'Choose an icon type.';
  if (['auto', 'lucide', 'monogram'].includes(d.kind) && !hex.test(d.color)) return 'Symbol color must be #RRGGBB.';
  if (d.background !== null && !hex.test(d.background)) return 'Background must be #RRGGBB, or choose None.';
  if (!['circle', 'square', 'rounded'].includes(d.shape)) return 'Choose a background shape.';
  if (d.kind === 'lucide' && !['lucide', 'feather', 'hugeicons'].includes(d.library ?? 'lucide')) return 'Choose an icon library.';
  if (Object.values(d.emojiOffsets ?? {}).some(o => !validOffset(o))) return 'Emoji offsets must be whole pixels between -8 and 8.';
  if (Object.values(d.adjustments ?? {}).some(o => !validAdjustment(o))) return 'Use position -8 to 8 px and size 50–150%.';
  if (d.kind === 'lucide' && !iconName.test(d.name)) return 'Choose a Lucide icon.';
  if (d.kind === 'monogram' && !monogramText.test(d.text.normalize('NFKC').trim().toUpperCase())) return 'Use one or two letters or numbers.';
  if (d.kind === 'emoji' && firstEmoji(d.emoji) !== d.emoji) return 'Paste one complete emoji.';
  if (d.kind === 'image' && !assetPath.test(d.image ?? '')) return 'Choose and import an image first.';
  return null;
}

function sanitizeText(text, name) {
  if (typeof text === 'string') {
    if (asciiMonogram.test(text)) return text;
    const normalized = ascii.test(text) ? text.trim().toUpperCase() : text.normalize('NFKC').trim().toUpperCase();
    if (asciiMonogram.test(normalized) || monogramText.test(normalized)) return normalized;
  }
  return monogram(name);
}

export function appearance(value, name, automatic, size = 24) {
  const src = value && typeof value === 'object' ? value : null;
  // An incomplete editor field must not replace the rest of the preview.
  // Sanitize into locals without cloning nested maps; validation still blocks saving it.
  const color = typeof src?.color === 'string' && hex.test(src.color) ? src.color : '#a78bfa';
  const rawBg = src && 'background' in src ? src.background : null;
  const background = rawBg !== null && typeof rawBg === 'string' && hex.test(rawBg) ? rawBg : null;
  const shape = src?.shape === 'circle' || src?.shape === 'square' || src?.shape === 'rounded' ? src.shape : 'rounded';
  const library = src?.library === 'lucide' || src?.library === 'feather' || src?.library === 'hugeicons' ? src.library : 'lucide';
  let dKind = src?.kind === 'auto' || src?.kind === 'lucide' || src?.kind === 'emoji' || src?.kind === 'monogram' || src?.kind === 'image' || src?.kind === 'herdr' ? src.kind : 'auto';
  let icon = src && 'name' in src ? src.name : 'folder-code';
  if (dKind === 'lucide' && (typeof icon !== 'string' || !iconName.test(icon))) icon = 'folder-code';
  let emoji = src && 'emoji' in src ? src.emoji : '🐑';
  if (dKind === 'emoji' && firstEmoji(emoji) !== emoji) emoji = '🐑';
  const image = src && 'image' in src ? src.image : null;
  if (dKind === 'image' && !assetPath.test(image ?? '')) dKind = 'auto';
  const kind = dKind === 'auto' ? (automatic ? 'image' : 'monogram') : dKind;
  const tKey = dKind === 'lucide' ? `${library}:${icon}` : dKind === 'emoji' ? `emoji:${emoji}` : dKind === 'image' ? `image:${image ?? ''}` : dKind;
  const rawAdjustment = src?.adjustments?.[tKey];
  const adjustment = validAdjustment(rawAdjustment) ? rawAdjustment : DEFAULT_ADJUSTMENT;
  const rawEmojiOffset = src?.emojiOffsets?.[emoji];
  const emojiOffset = validOffset(rawEmojiOffset) ? rawEmojiOffset : DEFAULT_OFFSET;
  const offset = dKind === 'emoji' ? emojiOffset : adjustment;
  return {
    kind, path: dKind === 'auto' ? automatic : image, name: icon, library,
    text: kind === 'emoji' ? emoji : dKind === 'auto' ? monogram(name) : sanitizeText(src?.text, name),
    foreground: color, background,
    emojiX: emojiOffset.x * size / 22,
    emojiY: emojiOffset.y * size / 22,
    offsetX: offset.x * size / 22, offsetY: offset.y * size / 22, scale: adjustment.scale / 100,
    radius: shape === 'circle' ? size / 2 : shape === 'square' ? 0 : size * 0.24,
  };
}

export function transformKey(d) {
  return d.kind === 'lucide' ? `${d.library ?? 'lucide'}:${d.name}` : d.kind === 'emoji' ? `emoji:${d.emoji}` : d.kind === 'image' ? `image:${d.image ?? ''}` : d.kind;
}

export function filterIcons(names, query) {
  const needle = String(query).trim().toLowerCase().replace(/\s+/g, '-');
  return needle ? names.filter(name => name.includes(needle)) : POPULAR.filter(name => names.includes(name));
}
