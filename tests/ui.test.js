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
  const menu = find(p.render(), 'ki-categories');
  assert.equal(find(menu, 'ki-category-arrows'), null);
  menu.handlers.on_open_change(true, cx);
  find(p.render(), 'ki-category-arrows').handlers.on_click({}, cx);
  p.search.set_value('arrow-down');
  assert.match(find(p.render(), 'ki-catalogue-status').nodes.join(''), /^Arrows · \d+ matches$/);
});

test('color swatches and saturation/brightness alternatives are keyboard reachable', () => {
  const p = picker(null); p.draft.kind = 'lucide';
  const rendered = p.render();
  assert.equal(find(rendered, 'ki-color-0').type, 'button');
  assert.match(find(rendered, 'ki-color-0').values.accessibility_label[0], /Symbol Gray/);
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
  const menu = find(p.render(), 'ki-categories');
  assert.equal(find(menu, 'ki-category-arrows'), null);
  menu.handlers.on_open_change(true, cx);
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

test('sidebar reads shared icon state once per render regardless of space count', () => {
  const original = state.spaces;
  state.spaces = Array.from({ length: 30 }, (_, i) => ({ id: `budget-${i}`, name: `Project ${i}`, folder: `D:/p${i}`, tabs: [] }));
  const counts = {};
  state.sharedReads = counts;
  try {
    const view = new Spaces(); view.init({}, cx);
    view.render();
    assert.equal(counts['kolczyk.spaces'], 1);
    assert.equal(counts['kolczyk.favicons'], 1);
  } finally { state.spaces = original; delete state.sharedReads; }
});

test('worktree follows parent edits until it saves a different icon', async () => {
  state.tasks = [];
  picker({ kind: 'lucide', name: 'folder' });
  await Promise.all(state.tasks);
  const parent = state.spaces[0];
  state.spaces.push({ ...parent, id: 'linked', name: 'Branch', folder: 'D:/linked' });
  try {
    state.props = { mode: 'picker', space: 'linked', parent: parent.id };
    const open = () => { const view = new Picker(); view.init(state.props, cx); return view; };
    const inherited = open();
    assert.equal(inherited.draft.name, 'folder');
    inherited.save();
    assert.equal(state.shared['kolczyk.spaces'].linked, undefined);
    state.shared['kolczyk.spaces'][parent.id].name = 'folder-code';
    const custom = open();
    assert.equal(custom.draft.name, 'folder-code');
    custom.draft.name = 'rocket';
    custom.save();
    state.shared['kolczyk.spaces'][parent.id].name = 'folder-open';
    assert.equal(open().draft.name, 'rocket');
    open().inherit();
    assert.equal(open().draft.name, 'folder-open');
    await Promise.all(state.tasks);
  } finally { state.spaces.pop(); }
});

test('sidebar folder creation, membership, folding, deletion and header setting persist', () => {
  picker(null);
  const sidebar = new Kolczyk();
  state.props = {};
  sidebar.init(state.props, { ...cx, spawn() {} });
  sidebar.shown.add('local-space');
  const click = (node, id) => find(node, id).handlers.on_click({}, cx);
  const dialog = options => {
    state.props = { mode: 'folders', ...options };
    const view = new Kolczyk();
    view.init(state.props, cx);
    return view.render().render();
  };
  const empty = sidebar.render();
  assert.ok(find(empty, 'folder-new'));
  assert.ok(find(empty, 'space-local-space'));
  const create = dialog({ action: 'new', space: 'local-space' });
  find(create, 'kf-name').input.set_value('Projects');
  click(create, 'kf-save');
  const { id } = state.shared['kolczyk.folders'].folders[0];
  const moveMenu = dialog({ action: 'move', space: 'local-space' });
  assert.equal(find(moveMenu, 'kf-create').values.h[0], find(moveMenu, 'kf-move-' + id).values.h[0]);
  assert.equal(moveMenu.nodes.length, 3, 'short move menu contains only its action rows');
  assert.equal(state.shared['kolczyk.folders'].membership['local-space'], id);
  state.props = { mode: 'picker', folder: id };
  const folderPicker = new Picker();
  folderPicker.init(state.props, cx);
  assert.ok(find(folderPicker.render(), 'ki-icon-folder'));
  assert.ok(find(folderPicker.render(), 'ki-icon-folder-code'));

  const root = state.spaces[0];
  const worktree = { ...root, id: 'linked' };
  const rows = [{ w: root, i: 0 }, { w: worktree, i: 1, parent: root }];
  const grouped = sidebar.folderRows(rows, null, {}, false, row => row.w.id);
  assert.deepEqual(grouped[0].nodes.slice(1).map(row => row.nodes[0]), ['local-space', 'linked']);
  assert.ok(find(grouped[0], 'folder-child-local-space'));
  for (const library of ['lucide', 'feather', 'hugeicons']) {
    folderPicker.draft.library = library;
    const filled = find(folderPicker.render(), 'ki-icon-folder-filled');
    assert.match(filled.values.tooltip[0], /unofficial Kolczyk variant/);
    filled.handlers.on_click({}, cx);
    assert.equal(folderPicker.draft.name, 'folder-filled');
  }
  folderPicker.save();
  assert.equal(state.shared['kolczyk.folders'].folders[0].appearance.library, 'hugeicons');
  assert.equal(find(folderPicker.render(), 'ki-next'), null);
  const settings = dialog({ action: 'settings' });
  click(settings, 'kf-show-button');
  assert.equal(find(sidebar.render(), 'folder-new'), null);
  click(dialog({ action: 'settings' }), 'kf-show-button');
  click(sidebar.render(), id);
  assert.equal(find(sidebar.render(), 'space-local-space'), null);
  click(dialog({ action: 'settings' }), 'kf-show-button');
  assert.equal(find(sidebar.render(), 'folder-new'), null);
  click(dialog({ action: 'menu', folder: id }), 'kf-remove');
  assert.ok(find(sidebar.render(), 'space-local-space'));
  click(dialog({ action: 'settings' }), 'kf-show-button');
  assert.ok(find(sidebar.render(), 'folder-new'));
  state.tasks = [];
});

test('saved swatch and shape become defaults for a different space', async () => {
  const first = picker(null);
  first.draft.kind = 'lucide';
  find(first.render(), 'ki-color-11').handlers.on_click({}, cx);
  first.draft.background = '#112233';
  first.draft.shape = 'circle';
  first.save();
  await Promise.all(state.tasks);
  const other = { ...state.spaces[0], id: 'other', name: 'Other' };
  state.spaces.push(other);
  try {
    state.props = { mode: 'picker', space: other.id };
    const next = new Picker();
    next.init(state.props, cx);
    assert.equal(next.draft.colorSwatch, 'Blue');
    assert.equal(next.draft.background, '#112233');
    assert.equal(next.draft.shape, 'circle');
    await Promise.all(state.tasks);
  } finally { state.spaces.pop(); }
});

test('folder dragging persists mixed order and moves expanded folders as a block', () => {
  picker(null);
  const previous = state.spaces;
  state.spaces = ['a', 'b', 'child', 'remote'].map(id => ({
    ...previous[0], id, name: id, machine: id === 'remote' ? 'remote' : null,
  }));
  try {
    state.shared['kolczyk.folders'] = {
      folders: ['first', 'second'].map(id => ({ id, name: id, machine: null })),
      membership: { child: 'first' },
    };
    const sidebar = new Spaces();
    sidebar.init({}, { ...cx, spawn() {} });
    state.spaces.forEach(s => sidebar.shown.add(s.id));
    const order = () => sidebar.grouped({}, false).map(el => el.values.id?.[0]);
    const drag = (source, target) => {
      const view = sidebar.render();
      find(view, source).handlers.on_mouse_down_left({}, cx);
      find(view, target).handlers.on_mouse_move({}, cx);
      find(view, target).handlers.on_mouse_up({}, cx);
    };
    assert.deepEqual(order().slice(1, 5), ['folder-entry-first', 'folder-entry-second', 'space-entry-a', 'space-entry-b']);
    drag('first', 'space-entry-a');
    assert.deepEqual(order().slice(1, 5), ['folder-entry-second', 'space-entry-a', 'folder-entry-first', 'space-entry-b']);
    drag('second', 'folder-entry-first');
    assert.deepEqual(order().slice(1, 5), ['space-entry-a', 'folder-entry-first', 'folder-entry-second', 'space-entry-b']);
    drag('first', 'space-entry-remote');
    assert.deepEqual(order().slice(1, 5), ['space-entry-a', 'folder-entry-first', 'folder-entry-second', 'space-entry-b']);
    assert.equal(state.shared['kolczyk.folders'].membership.child, 'first');
    assert.ok(find(find(sidebar.render(), 'folder-entry-first'), 'space-child'));
  } finally {
    state.spaces = previous;
    delete state.shared['kolczyk.folders'];
  }
});

test('dropping between rows moves spaces into and out of folders', () => {
  picker(null);
  const source = state.spaces[0];
  const target = { ...source, id: 'target', name: 'Target' };
  state.spaces.push(target);
  try {
    state.shared['kolczyk.folders'] = {
      folders: [{ id: 'folder-test', name: 'Test', machine: null }],
      membership: { target: 'folder-test' },
    };
    const sidebar = new Spaces();
    sidebar.init({}, { ...cx, spawn() {} });
    sidebar.shown.add(source.id);
    sidebar.shown.add(target.id);
    const rows = sidebar.render();
    find(rows, 'space-' + source.id).handlers.on_mouse_down_left({}, cx);
    const destination = find(rows, 'space-target');
    destination.handlers.on_mouse_move({}, cx);
    destination.handlers.on_mouse_up({}, cx);
    assert.equal(state.shared['kolczyk.folders'].membership[source.id], 'folder-test');
    assert.deepEqual(state.commands.at(-1), { name: 'space.move', args: { id: source.id, index: 2 } });

    const outside = { ...source, id: 'outside', name: 'Outside' };
    state.spaces.push(outside);
    try {
      sidebar.shown.add(outside.id);
      const updated = sidebar.render();
      find(updated, 'space-' + source.id).handlers.on_mouse_down_left({}, cx);
      const outsideRow = find(updated, 'space-outside');
      outsideRow.handlers.on_mouse_move({}, cx);
      outsideRow.handlers.on_mouse_up({}, cx);
      assert.equal(state.shared['kolczyk.folders'].membership[source.id], undefined);
      assert.deepEqual(state.commands.at(-1), { name: 'space.move', args: { id: source.id, index: 3 } });
    } finally { state.spaces.pop(); }
  } finally { state.spaces.pop(); }
});
