import test from 'node:test';
import assert from 'node:assert/strict';
import { draftFor, validateDraft, appearance, filterIcons, firstEmoji, transformKey } from '../mods/kolczyk/model.js';

test('draft is detached from persisted state and defaults to automatic', () => {
  const saved = { kind: 'emoji', emoji: '🐑', background: '#112233', shape: 'circle' };
  const draft = draftFor(saved, 'Kolczyk');
  draft.background = '#ffffff';
  assert.equal(saved.background, '#112233');
  assert.equal(draftFor(null, 'Silver Orchard').kind, 'auto');
  assert.equal(draftFor(null, 'Silver Orchard').text, 'SO');
});

test('every icon type shares background color and shape', () => {
  for (const kind of ['auto', 'lucide', 'emoji', 'monogram', 'image']) {
    const draft = { ...draftFor(null, 'Sheep'), kind, background: '#123456', shape: 'circle', image: 'assets/kolczyk/abc.png' };
    const a = appearance(draft, 'Sheep', 'assets/kolczyk/favicon.png', 24);
    assert.equal(a.background, '#123456', kind);
    assert.equal(a.radius, 12, kind);
  }
  assert.equal(appearance({ ...draftFor(null, 'A'), shape: 'square' }, 'A', null, 24).radius, 0);
});

test('automatic favicon falls back to monogram without losing background', () => {
  const draft = { ...draftFor(null, 'Silver Orchard'), background: '#123456' };
  assert.equal(appearance(draft, 'Silver Orchard', 'icon.svg').kind, 'image');
  assert.equal(appearance(draft, 'Silver Orchard', null).text, 'SO');
  assert.equal(appearance(draft, 'Silver Orchard', null).background, '#123456');
});

test('Automatic derives fresh initials and never reuses manual monogram text', () => {
  const draft = { ...draftFor(null, 'Old Name'), kind: 'auto', text: 'XY' };
  assert.equal(appearance(draft, 'Blue App', null).text, 'BA');
  assert.equal(appearance({ ...draft, kind: 'monogram' }, 'Blue App', null).text, 'XY');
});

test('validation rejects invalid monograms, colors, shapes and unimported images', () => {
  const d = { ...draftFor(null, 'A'), kind: 'monogram', text: 'Ą7' };
  assert.equal(validateDraft(d), null);
  for (const text of ['', 'ABC', 'A!', '🐑']) assert.ok(validateDraft({ ...d, text }));
  assert.ok(validateDraft({ ...d, color: 'red' }));
  assert.ok(validateDraft({ ...d, background: '#12345678' }));
  assert.ok(validateDraft({ ...d, shape: 'triangle' }));
  assert.ok(validateDraft({ ...d, kind: 'image', image: 'D:/secret.png' }));
});

test('emoji accepts whole graphemes including flags, keycaps and ZWJ', () => {
  for (const emoji of ['🐑', '🇵🇱', '1️⃣', '👨‍👩‍👧‍👦', '🛠️']) {
    assert.equal(firstEmoji(emoji + ' other'), emoji);
    assert.equal(validateDraft({ ...draftFor(null, 'A'), kind: 'emoji', emoji }), null);
  }
  assert.equal(firstEmoji('abc'), null);
  assert.ok(validateDraft({ ...draftFor(null, 'A'), kind: 'emoji', emoji: 'abc' }));
});

test('search covers all supplied Lucide names, including normalized spaces', () => {
  const names = ['folder-code', 'sheep', 'alarm-clock', 'alarm-clock-check'];
  assert.deepEqual(filterIcons(names, 'alarm clock'), ['alarm-clock', 'alarm-clock-check']);
  assert.deepEqual(filterIcons(names, 'SHEEP'), ['sheep']);
  assert.deepEqual(filterIcons(names, 'does-not-exist'), []);
});

test('emoji adjustments are isolated per glyph, cloned and scaled from sidebar pixels', () => {
  const saved = { kind: 'emoji', emoji: '⚙️', emojiOffsets: { '⚙️': { x: 1, y: 2 } } };
  const d = draftFor(saved, 'App');
  assert.equal(appearance(d, 'App', null, 22).emojiX, 1);
  assert.equal(appearance(d, 'App', null, 44).emojiY, 4);
  assert.equal(appearance({ ...d, emoji: '🐑' }, 'App', null, 22).emojiX, 0);
  d.emojiOffsets['⚙️'].x = 3;
  assert.equal(saved.emojiOffsets['⚙️'].x, 1);
  assert.ok(validateDraft({ ...d, emojiOffsets: { '⚙️': { x: 99, y: 0 } } }));
});

test('all icon types support independent position and size without resizing background', () => {
  for (const kind of ['auto', 'lucide', 'monogram', 'image', 'emoji']) {
    const d = { ...draftFor(null, 'App'), kind, image: 'assets/kolczyk/abc.png' };
    const key = transformKey(d);
    d.adjustments[key] = { x: 2, y: -1, scale: 125 };
    if (kind === 'emoji') d.emojiOffsets[d.emoji] = { x: 2, y: -1 };
    const a = appearance(d, 'App', null, 22);
    assert.equal(a.offsetX, 2); assert.equal(a.offsetY, -1); assert.equal(a.scale, 1.25);
    assert.equal(a.radius, appearance({ ...d, adjustments: {} }, 'App', null, 22).radius);
  }
});

test('Default Herdr remains selectable even when custom settings are invalid', () => {
  assert.equal(validateDraft({ kind: 'herdr', color: 'invalid', background: 'invalid' }), null);
});

test('changing from an invalid symbol color to emoji or image permits saving', () => {
  const d = { ...draftFor(null, 'App'), kind: 'lucide', color: 'qq', background: '#123456' };
  assert.ok(validateDraft(d));
  for (const kind of ['emoji', 'image']) {
    const changed = { ...d, kind, image: 'assets/kolczyk/abc.svg' };
    assert.equal(validateDraft(changed), null);
    const preview = appearance(changed, 'App', null);
    assert.equal(preview.kind, kind);
    assert.equal(preview.background, '#123456');
  }
});

test('an incomplete color edit preserves the chosen symbol, background and transform', () => {
  const d = { ...draftFor(null, 'App'), kind: 'lucide', name: 'sheep', color: 'qq', background: '#123456', shape: 'circle' };
  d.adjustments[transformKey(d)] = { x: 2, y: -1, scale: 125 };
  const preview = appearance(d, 'App', null, 22);
  assert.equal(preview.kind, 'lucide');
  assert.equal(preview.name, 'sheep');
  assert.equal(preview.background, '#123456');
  assert.equal(preview.radius, 11);
  assert.equal(preview.offsetX, 2);
  assert.equal(preview.scale, 1.25);
  assert.match(preview.foreground, /^#[a-f0-9]{6}$/i);
  assert.equal(d.color, 'qq');
});
