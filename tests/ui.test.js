import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { state, cx, find } from './runtime.js';
registerHooks({ resolve(specifier, context, next) {
  return ['gpui-kit', 'gpui-base', 'herdr'].includes(specifier)
    ? { url: new URL('./runtime.js', import.meta.url).href, shortCircuit: true }
    : next(specifier, context);
} });
const { default: Picker } = await import('../mods/kolczyk/picker.js');
const { default: Spaces } = await import('../mods/kolczyk/spaces.js');
const { default: Kolczyk } = await import('../mods/kolczyk/main.js');

test('obsolete failed import does not block a newer emoji selection', async () => {
  const p = picker(null); await Promise.all(state.tasks); state.tasks = [];
  let reject; state.exec = () => new Promise((_resolve, fail) => { reject = fail; });
  p.draft.kind = 'image'; p.importImage('D:/old.png', cx);
  await new Promise(resolve => setImmediate(resolve));
  find(p.render(), 'ki-mode-emoji').handlers.on_click({}, cx);
  assert.equal(find(p.render(), 'ki-save').values.disabled[0], false, 'superseded work must not disable the new mode');
  reject(new Error('old image import failed')); await Promise.all(state.tasks);
  assert.equal(p.error, '');
  assert.equal(find(p.render(), 'ki-save').values.disabled[0], false);
});

test('every disabled draft exposes its validation message beside the footer', () => {
  const p = picker(null); p.draft.kind = 'image';
  assert.ok(find(p.render(), 'ki-save-error'));
});

test('missing optional helper leaves manual modes saveable and explains Automatic/Image', async () => {
  state.exec = async command => {
    if (command === 'git') return { code: 1, stdout: '' };
    throw new Error('node not installed');
  };
  const p = picker(null); await Promise.all(state.tasks);
  assert.equal(p.info.available, false);
  p.draft.kind = 'auto';
  assert.ok(find(p.render(), 'ki-helper-retry'));
  assert.equal(find(p.render(), 'ki-save').values.disabled[0], true);
  p.save(); assert.ok(state.shared['kolczyk.spaces']?.['local-space'] == null);
  p.draft.kind = 'monogram'; p.draft.text = 'OK';
  assert.equal(find(p.render(), 'ki-save').values.disabled[0], false);
  p.draft.kind = 'image';
  assert.ok(find(p.render(), 'ki-helper-retry'));
  assert.equal(find(p.render(), 'ki-image-import'), null);
});

test('catalogue grids have named native buttons and roving arrow selection', () => {
  const p = picker(null); p.draft.kind = 'lucide'; p.browse = 'all';
  const first = find(p.render(), 'ki-icon-a-arrow-down');
  assert.equal(first.type, 'button'); assert.equal(first.values.tab_stop[0], true);
  assert.match(first.values.tooltip[0], /a-arrow-down/);
  let focused = false; p.gridHandles.icon[1].focus = () => { focused = true; };
  first.handlers.on_key_down({ key: 'right' }, cx);
  assert.equal(p.draft.name, 'a-arrow-up'); assert.equal(focused, true);
  assert.equal(find(p.render(), 'ki-icon-a-arrow-down').values.tab_stop[0], false);
  p.draft.kind = 'emoji';
  const sheep = find(p.render(), 'ki-emoji-0');
  assert.match(sheep.values.accessibility_label[0], /Sheep/);
  sheep.handlers.on_key_down({ key: 'down' }, cx);
  assert.equal(p.draft.emoji, '⌨️'); assert.equal(p.emojiInput.value(), '⌨️');
});

test('dialog caps height while keeping sidebar samples inside Adjust rather than the form', () => {
  const p = picker(null); p.draft.kind = 'lucide'; state.viewportHeight = 500;
  try {
    const rendered = p.render(); assert.equal(rendered.values.h[0], 468);
    assert.ok(find(find(rendered, 'ki-adjust-popover'), 'ki-sidebar-previews'));
    assert.equal(find(find(rendered, 'ki-picker-body'), 'ki-sidebar-previews'), null);
    assert.equal(find(rendered, 'ki-save').values.disabled[0], false);
  } finally { delete state.viewportHeight; }
});

test('category status gives its name and filtered result count', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  find(p.render(), 'ki-category-arrows').handlers.on_click({}, cx);
  p.search.set_value('arrow-down');
  assert.match(find(p.render(), 'ki-catalogue-status').nodes.join(''), /^Arrows · \d+ matches$/);
});

test('color swatches and saturation/brightness alternatives are keyboard reachable', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  const rendered = p.render();
  assert.equal(find(rendered, 'ki-color-0').type, 'button');
  assert.match(find(rendered, 'ki-color-0').values.accessibility_label[0], /Symbol #/);
  for (const key of ['saturation', 'brightness']) {
    const slider = find(rendered, `ki-color-${key}`);
    assert.equal(slider.type, 'slider'); assert.equal(slider.values.tab_index[0], 0);
    const before = p.draft.color;
    slider.handlers.on_key_down({ key: 'home' }, cx);
    assert.notEqual(p.draft.color, before);
  }
});

test('thumbnail work is lazy and bounded, and failures do not alter the draft', async () => {
  const p = picker({ kind: 'image', image: 'assets/kolczyk/ab.png' });
  await Promise.all(state.tasks); state.tasks = [];
  let calls = 0; state.exec = async () => { calls++; throw new Error('bad thumbnail'); };
  for (let i = 0; i < 20; i++) p.thumbnail(`D:/image-${i}.png`, cx);
  await Promise.all(state.tasks);
  assert.equal(calls, 12); assert.equal(p.error, '');
  assert.equal(p.draft.image, 'assets/kolczyk/ab.png');
});

test('a failed replacement keeps the previous valid image saveable', async () => {
  const p = picker({ kind: 'image', image: 'assets/kolczyk/ab.png' });
  await Promise.all(state.tasks); state.tasks = [];
  state.exec = async () => { throw new Error('replacement failed'); };
  p.importImage('D:/invalid.png', cx); await Promise.all(state.tasks);
  assert.match(find(p.render(), 'ki-save-error').nodes.join(''), /replacement failed/);
  assert.equal(find(p.render(), 'ki-save').values.disabled[0], false);
});

test('obsolete completion cannot clear a newer import busy state', async () => {
  const p = picker(null); await Promise.all(state.tasks); state.tasks = [];
  const finish = [];
  state.exec = () => new Promise(resolve => { finish.push(resolve); });
  p.draft.kind = 'image'; p.importImage('D:/first.png', cx);
  await new Promise(resolve => setImmediate(resolve));
  find(p.render(), 'ki-mode-emoji').handlers.on_click({}, cx);
  find(p.render(), 'ki-mode-image').handlers.on_click({}, cx);
  p.importImage('D:/second.png', cx);
  await new Promise(resolve => setImmediate(resolve));
  finish[0]({ code: 0, stdout: '{"path":"assets/kolczyk/aa.png"}' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(p.importing, true);
  finish[1]({ code: 0, stdout: '{"path":"assets/kolczyk/bb.png"}' });
  await Promise.all(state.tasks);
  assert.equal(p.importing, false); assert.equal(p.draft.image, 'assets/kolczyk/bb.png');
});
test.beforeEach(async () => { await Promise.all(state.tasks); state.tasks = []; state.exec = null; });

function picker(saved) {
  state.props = { mode: 'picker', space: 'local-space', overlay: 'test-overlay' };
  state.shared = { 'kolczyk.spaces': { 'local-space': saved, 'offline/other': { kind: 'emoji', emoji: '🐏' } } };
  state.closed = []; state.overlays = [];
  const view = new Picker(); view.init(state.props, cx); return view;
}

test('Cancel discards draft, Save preserves other machine settings', () => {
  const p = picker({ kind: 'emoji', emoji: '🐑', background: '#123456', shape: 'circle' });
  p.draft.emoji = '🚀';
  find(p.render(), 'ki-cancel').handlers.on_click({}, cx);
  assert.equal(state.shared['kolczyk.spaces']['local-space'].emoji, '🐑');
  p.save();
  assert.equal(state.shared['kolczyk.spaces']['local-space'].emoji, '🚀');
  assert.equal(state.shared['kolczyk.spaces']['offline/other'].emoji, '🐏');
});

test('invalid monogram cannot Save and Escape does not persist', () => {
  const p = picker(null); p.draft.kind = 'monogram'; p.draft.text = 'ABC';
  p.save();
  assert.equal(state.shared['kolczyk.spaces']['local-space'], null);
  p.key({ key: 'escape' }, cx);
  assert.deepEqual(state.closed, ['test-overlay']);
});

test('changing source preserves arbitrary colors/background and shape', () => {
  const p = picker(null);
  p.draft.background = '#1a2b3c'; p.draft.color = '#abcdef'; p.draft.shape = 'circle';
  for (const mode of ['lucide', 'emoji', 'monogram', 'image', 'auto']) {
    find(p.render(), 'ki-mode-' + mode).handlers.on_click({}, cx);
    assert.equal(p.draft.background, '#1a2b3c');
    assert.equal(p.draft.shape, 'circle');
    assert.ok(find(p.render(), 'ki-preview'));
  }
});

test('both expanded and compact space rows expose Change icon menu', () => {
  state.props = {}; state.shared = {}; state.width = 268;
  const view = new Spaces(); view.init({}, cx);
  const record = { w: state.spaces[0], i: 0, g: null, tree: null };
  for (const el of [view.row(record, {}), view.compact(record, {})]) {
    assert.ok(el.handlers.on_mouse_down);
    el.handlers.on_mouse_down({}, cx);
    assert.equal(state.overlays.at(-1).props.mode, 'menu');
  }
});

test('late favicon from previous folder is ignored and current folder is scanned', async () => {
  let finishA;
  state.exec = async (command, args) => {
    if (command === 'git') return { code: 1, stdout: '' };
    if (args.includes('D:/project')) return new Promise(resolve => { finishA = resolve; });
    return { code: 0, stdout: JSON.stringify({ automatic: 'assets/kolczyk/bb.svg', source: 'favicon.svg', files: [] }) };
  };
  const p = picker(null);
  await new Promise(resolve => setImmediate(resolve));
  state.spaces[0].folder = 'D:/new-project';
  p.syncFolder(cx);
  await new Promise(resolve => setImmediate(resolve));
  finishA({ code: 0, stdout: JSON.stringify({ automatic: 'assets/kolczyk/aa.svg', files: [] }) });
  await Promise.all(state.tasks);
  assert.equal(p.info.automatic, 'assets/kolczyk/bb.svg');
  assert.equal(state.shared['kolczyk.favicons']['local-space'].key, JSON.stringify([null, 'D:/new-project']));
  state.spaces[0].folder = 'D:/project';
});

test('late image import cannot override a newly selected icon type', async () => {
  const p = picker(null);
  await Promise.all(state.tasks); state.tasks = [];
  let finish;
  state.exec = async () => new Promise(resolve => { finish = resolve; });
  p.draft.kind = 'image';
  p.importImage('D:/image.png', cx);
  await new Promise(resolve => setImmediate(resolve));
  find(p.render(), 'ki-mode-emoji').handlers.on_click({}, cx);
  finish({ code: 0, stdout: '{"path":"assets/kolczyk/abc.png"}' });
  await Promise.all(state.tasks);
  assert.equal(p.draft.kind, 'emoji');
  assert.equal(p.draft.image, null);
  assert.equal(p.importing, false);
});

test('image completion checks live folder even before the folder timer runs', async () => {
  const p = picker(null);
  await Promise.all(state.tasks); state.tasks = [];
  let finish;
  state.exec = async () => new Promise(resolve => { finish = resolve; });
  p.draft.kind = 'image'; p.importImage('D:/image.png', cx);
  await new Promise(resolve => setImmediate(resolve));
  state.spaces[0].folder = 'D:/other-folder';
  finish({ code: 0, stdout: '{"path":"assets/kolczyk/abc.png"}' });
  await Promise.all(state.tasks);
  assert.equal(p.draft.image, null);
  state.spaces[0].folder = 'D:/project';
});

test('browse all exposes non-popular icons and paging without a search query', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  const browse = find(p.render(), 'ki-browse-all');
  assert.ok(browse, 'All catalogue button');
  browse.handlers.on_click({}, cx);
  assert.ok(find(p.render(), 'ki-next'));
  assert.ok(find(p.render(), 'ki-icon-a-arrow-down'));
});

test('icon catalogue tiles preview selected background for white symbols', () => {
  const p = picker(null); p.draft.kind = 'lucide'; p.draft.color = '#ffffff'; p.draft.background = '#123456';
  const tile = find(p.render(), 'ki-icon-globe');
  const walk = el => el?.values?.bg?.[0] === '#123456' || (el?.nodes ?? []).some(walk);
  assert.ok(walk(tile), 'white icon has its selected background inside catalogue tile');
});

test('icon library selection persists and validates the selected catalogue', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  const feather = find(p.render(), 'ki-library-feather');
  assert.ok(feather);
  feather.handlers.on_click({}, cx);
  p.draft.name = 'activity'; p.save();
  assert.equal(state.shared['kolczyk.spaces']['local-space'].library, 'feather');
});

test('emoji Adjust moves one sidebar pixel, resets and respects Cancel/Save', () => {
  const p = picker({ kind: 'emoji', emoji: '🐑' });
  p.moveEmoji(1, 0, cx); p.moveEmoji(0, 1, cx);
  assert.deepEqual(p.draft.emojiOffsets['🐑'], { x: 1, y: 1 });
  find(p.render(), 'ki-cancel').handlers.on_click({}, cx);
  assert.equal(state.shared['kolczyk.spaces']['local-space'].emojiOffsets, undefined);
  p.save();
  assert.deepEqual(state.shared['kolczyk.spaces']['local-space'].emojiOffsets['🐑'], { x: 1, y: 1 });
  p.resetEmoji(cx);
  assert.deepEqual(p.draft.emojiOffsets['🐑'], { x: 0, y: 0 });
  assert.deepEqual(state.shared['kolczyk.spaces']['local-space'].emojiOffsets['🐑'], { x: 1, y: 1 });
});

test('Adjust is beside preview for every mode and eleven icon columns fit', () => {
  const p = picker(null);
  for (const kind of ['auto', 'lucide', 'emoji', 'monogram', 'image']) {
    p.draft.kind = kind;
    assert.ok(find(p.render(), 'ki-adjust'));
  }
  p.draft.kind = 'lucide'; p.browse = 'all';
  assert.ok(find(p.render(), 'ki-icon-grid-row-0').nodes.length === 11);
});

test('monogram validation is inline and omitted until editing', () => {
  const p = picker(null); p.draft.kind = 'monogram'; p.draft.text = '';
  assert.equal(find(p.render(), 'ki-monogram-error'), null);
  p.letters.set_value('ABC');
  assert.ok(find(p.render(), 'ki-monogram-error'));
});

test('category filtering composes with search and library switching resets category', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  find(p.render(), 'ki-category-arrows').handlers.on_click({}, cx);
  assert.equal(p.category, 'arrows');
  p.search.set_value('arrow-down');
  assert.ok(find(p.render(), 'ki-icon-arrow-down'));
  assert.equal(find(p.render(), 'ki-icon-heart'), null);
  find(p.render(), 'ki-library-feather').handlers.on_click({}, cx);
  assert.equal(p.category, 'all');
});

test('native visual color selection updates draft and never leaks through Cancel', () => {
  const p = picker({ kind: 'emoji', emoji: '🐑', background: '#123456' });
  p.colorPickers.background.position({ local_position: { x: 100, y: 70 } }, cx);
  assert.notEqual(p.draft.background, '#123456');
  assert.equal(p.backgroundInput.value(), p.draft.background);
  find(p.render(), 'ki-cancel').handlers.on_click({}, cx);
  assert.equal(state.shared['kolczyk.spaces']['local-space'].background, '#123456');
});

test('vector size and position are clamped and Reset restores just that symbol', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  p.moveIcon(99, -99, cx); p.resizeIcon(99, cx);
  assert.deepEqual(p.draft.adjustments['lucide:folder-code'], { x: 8, y: -8, scale: 150 });
  p.draft.name = 'globe'; p.resizeIcon(-99, cx);
  assert.equal(p.draft.adjustments['lucide:globe'].scale, 50);
  p.resetIcon(cx);
  assert.deepEqual(p.draft.adjustments['lucide:globe'], { x: 0, y: 0, scale: 100 });
  assert.equal(p.draft.adjustments['lucide:folder-code'].scale, 150);
});

test('invalid custom emoji has inline feedback and cannot Save', () => {
  const p = picker(null); p.draft.kind = 'emoji';
  p.emojiInput.set_value('letters');
  assert.ok(find(p.render(), 'ki-emoji-error'));
  p.save();
  assert.equal(state.shared['kolczyk.spaces']['local-space'], null);
});

test('Default Herdr resets only selected space on Save and Cancel keeps its icon', () => {
  const saved = { kind: 'emoji', emoji: '🐑', background: '#123456', emojiOffsets: { '🐑': { x: 1, y: 2 } }, adjustments: { 'emoji:🐑': { x: 0, y: 0, scale: 125 } } };
  const p = picker(saved);
  find(p.render(), 'ki-mode-herdr').handlers.on_click({}, cx);
  find(p.render(), 'ki-cancel').handlers.on_click({}, cx);
  assert.deepEqual(state.shared['kolczyk.spaces']['local-space'], saved);
  p.save();
  assert.deepEqual(state.shared['kolczyk.spaces']['local-space'], { kind: 'herdr' });
  assert.equal(state.shared['kolczyk.spaces']['offline/other'].emoji, '🐏');
  const reopened = picker({ kind: 'herdr' });
  assert.equal(reopened.draft.kind, 'herdr');
  assert.equal(find(reopened.render(), 'ki-adjust'), null);
});

test('Default Herdr uses stock single initial and stock compact number', () => {
  state.shared = { 'kolczyk.spaces': { 'local-space': { kind: 'herdr' } }, 'space.colors': { 'local-space': '#123456' } };
  state.props = {};
  const view = new Spaces(); view.init({}, cx);
  const text = el => [typeof el === 'string' ? el : '', ...(el?.nodes ?? []).flatMap(node => text(node))].join('');
  const record = { w: state.spaces[0], i: 0, g: null, tree: null };
  assert.equal(text(view.spaceAvatar(record.w)), 'S');
  assert.ok(text(view.compact(record, {})).startsWith('1'));
});

test('root rerender after Save updates sidebar without a child mouse event', () => {
  const p = picker({ kind: 'emoji', emoji: '🐑' });
  // Model GPUI's retained child cache: rerendering a parent does not rebuild it.
  const rootCx = { ...cx, spawn() {}, new(Class, props) {
    const child = new Class(); child.init?.(props, rootCx);
    return { retained: child.render() };
  } };
  state.props = {};
  const root = new Kolczyk(); root.init({}, rootCx);
  const text = el => typeof el === 'string' ? el : el && Object.hasOwn(el, 'retained') ? text(el.retained) : (el?.nodes ?? []).map(text).join('');
  assert.ok(text(root.render(rootCx)).includes('🐑'));
  p.draft.emoji = '🚀'; p.save();
  assert.ok(text(root.render(rootCx)).includes('🚀'), 'shared-state root rerender must show saved icon immediately');
});
