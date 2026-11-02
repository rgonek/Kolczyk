import { View, div, image } from 'gpui-kit';
import { h_flex, v_flex, InputState, Input, Popover, Button } from 'gpui-base';
import { props, spaces, panes, shared, setShared, closeOverlay, theme } from 'herdr';
import { draftFor, validateDraft, filterIcons, firstEmoji, COLORS, EMOJIS, transformKey } from './model.js';
import { ICONS } from './catalogue.js';
import { FEATHER, HUGEICONS } from './libraries.js';
import { avatar, herdrAvatar } from './avatar.js';
import { assetAction, projectAssets } from './assets.js';
import { CATEGORIES } from './categories.js';
import { button, group, ColorPicker } from './controls.js';
import { contrastBacking } from './color.js';

const MODES = [['herdr', 'Default Herdr'], ['auto', 'Automatic'], ['lucide', 'Icons'], ['emoji', 'Emoji'], ['monogram', 'Monogram'], ['image', 'Image']];
const LIBRARIES = { lucide: ICONS, feather: FEATHER, hugeicons: HUGEICONS };
const EMOJI_NAMES = ['Sheep', 'Ram', 'Laptop', 'Tools', 'Rocket', 'Robot', 'Sparkles', 'Lightning', 'Globe', 'Mobile phone', 'Desktop computer', 'Keyboard', 'Gear', 'File cabinet', 'Cloud', 'Package', 'Books', 'Test tube', 'Lock', 'Game controller', 'Musical note', 'Clapper board', 'Framed picture', 'Shopping bags', 'Fire', 'Light bulb', 'Puzzle piece', 'Bar chart', 'Brain', 'Unicorn', 'Octopus', 'Seedling'];

export default class Picker extends View {
  init(_props, cx) {
    this.id = props()?.space;
    this.space = spaces().find(s => s.id === this.id);
    this.draft = draftFor((shared('kolczyk.spaces') ?? {})[this.id], this.space?.name);
    this.handle = cx.focus_handle();
    this.gridHandles = { icon: Array.from({ length: 66 }, () => cx.focus_handle()), emoji: EMOJIS.map(() => cx.focus_handle()) };
    this.handle.focus();
    this.touched = {}; this.category = 'all'; this.categoryQuery = '';
    this.query = ''; this.page = 0; this.browse = 'popular'; this.loading = false; this.importing = false;
    this.info = { automatic: null, files: [] }; this.error = ''; this.request = 0; this.importRequest = 0;
    this.thumbnails = {}; this.thumbnailRequests = new Set(); this.imageSource = '';
    this.search = this.input('', value => { this.query = value; this.page = 0; }, 'Search icons…');
    this.emojiInput = this.input(this.draft.emoji, value => { this.draft.emoji = firstEmoji(value) ?? value; this.touched.emoji = true; });
    this.letters = this.input(this.draft.text, value => { this.draft.text = value; this.touched.monogram = true; });
    this.foregroundInput = this.input(this.draft.color, value => { this.draft.color = value.trim(); });
    this.backgroundInput = this.input(this.draft.background ?? '#252536', value => { this.draft.background = value.trim(); });
    this.imageInput = this.input('', value => { this.imagePath = value; });
    this.imagePath = '';
    this.categoryInput = this.input('', value => { this.categoryQuery = value; }, 'Find category…');
    this.colorPickers = Object.fromEntries(['color', 'background'].map(key => [key, new ColorPicker(key,
      () => this.draft[key], value => { this.draft[key] = value; (key === 'color' ? this.foregroundInput : this.backgroundInput).set_value(value); })]));
    this.reload(cx);
    cx.timer.every(500, cx => this.syncFolder(cx));
  }

  input(value, change, placeholder = '') {
    const input = InputState.new({ value, placeholder });
    input.on('change', (_e, cx) => { change(input.value()); this.error = ''; cx.notify(); });
    return input;
  }

  folder() {
    const space = spaces().find(s => s.id === this.id) ?? this.space;
    const tabs = new Set((space?.tabs ?? []).map(t => t.id));
    return panes().find(p => tabs.has(p.tab) && p.cwd)?.cwd || space?.folder;
  }

  reload(cx) {
    if (this.loading) return;
    this.loading = true;
    const request = ++this.request;
    const folder = this.folder();
    const machine = spaces().find(s => s.id === this.id)?.machine ?? null;
    this.scannedKey = JSON.stringify([machine, folder]);
    cx.spawn(async cx => {
      try {
        const info = await projectAssets(folder, machine);
        if (request === this.request && folder === this.folder()) {
          this.info = info;
          setShared('kolczyk.favicons', { ...(shared('kolczyk.favicons') ?? {}), [this.id]: { key: JSON.stringify([machine, folder]), path: info.automatic, at: Date.now() } });
        }
      } catch (error) { if (request === this.request) this.info = { automatic: null, files: [], message: String(error.message ?? error) }; }
      finally { if (request === this.request) { this.loading = false; cx.notify(); } }
    });
  }

  syncFolder(cx) {
    const space = spaces().find(s => s.id === this.id);
    if (!space) return;
    const renamed = this.space?.name !== space.name;
    this.space = space;
    if (renamed) cx.notify();
    const key = JSON.stringify([space.machine ?? null, this.folder()]);
    if (key === this.scannedKey) return;
    this.request++; this.importRequest++; this.loading = false; this.importing = false;
    this.info = { automatic: null, files: [] };
    this.reload(cx); cx.notify();
  }

  importImage(path, cx) {
    if (!path?.trim() || this.importing) return;
    this.importing = true; this.error = '';
    const request = ++this.importRequest;
    const folder = this.folder();
    cx.spawn(async cx => {
      try {
        const result = await assetAction('Import', path.trim().replace(/^["']|["']$/g, ''));
        // Import may complete after the user has switched to another icon type.
        if (this.draft.kind === 'image' && request === this.importRequest && folder === this.folder()) {
          this.draft.image = result.path; this.imageSource = path.trim();
        }
      } catch (error) {
        if (this.draft.kind === 'image' && request === this.importRequest && folder === this.folder()) this.error = String(error.message ?? error);
      }
      finally { if (request === this.importRequest) this.importing = false; cx.notify(); }
    });
  }

  save() {
    if (this.draft.kind === 'auto' && this.info.available === false) return;
    const error = validateDraft(this.draft);
    if (error || this.importing || !spaces().some(s => s.id === this.id)) { this.error = error || 'This space is no longer available.'; return; }
    if (this.draft.kind === 'lucide' && !LIBRARIES[this.draft.library]?.includes(this.draft.name)) { this.error = 'Choose an icon from the selected catalogue.'; return; }
    const value = this.draft.kind === 'herdr' ? { kind: 'herdr' } : { ...this.draft, text: this.draft.text.normalize('NFKC').trim().toUpperCase() };
    // Merge a fresh snapshot: never erase preferences saved from another window.
    setShared('kolczyk.spaces', { ...(shared('kolczyk.spaces') ?? {}), [this.id]: value });
    closeOverlay(props()?.overlay);
  }

  key(e, cx) {
    if (e.key === 'escape') { closeOverlay(props()?.overlay); cx.stop_propagation(); }
  }

  button(id, text, action, selected = false, disabled = false) {
    return button(id, text, action, selected, disabled);
  }

  field(input, id, hint = '') {
    const t = theme();
    return Input.new(input).id(id).accessibility_label(hint || id.replace(/^ki-/, '').replace(/-/g, ' ')).h(33).px(9).rounded(7).border_1().border_color(t.input)
      .bg(t.background).text_color(t.foreground).text_size(12);
  }

  label(text) { return div().text_size(11).text_color(theme().muted).child(text); }

  colors(background) {
    const d = this.draft, t = theme(), key = background ? 'background' : 'color';
    const input = background ? this.backgroundInput : this.foregroundInput;
    return v_flex().flex_none().gap(7)
      .child(this.label(background ? 'Background color — any #RRGGBB' : 'Symbol color — any #RRGGBB'))
      .child(h_flex().gap(4).items_center()
        .when(background, el => el.child(this.button('ki-bg-none', 'None', () => { d.background = null; }, d.background === null)))
        .children(COLORS.map((color, i) => Button.new(`ki-${key}-${i}`).tab_index(0).accessibility_label(`${background ? 'Background' : 'Symbol'} ${color}`).tooltip(color).size(21).rounded(5).bg(color)
          .border(d[key] === color ? 2 : 1).border_color(d[key] === color ? t.foreground : t.border).cursor_pointer()
          .on_click((_e, cx) => { d[key] = color; input.set_value(color); cx.notify(); }))))
      .child(h_flex().gap(7).items_center()
        .child(this.colorPickers[key].render())
        .child(div().flex_1().child(this.field(input, `ki-${key}-hex`, '#RRGGBB'))))
      .when(d[key] !== null && !/^#[a-f0-9]{6}$/i.test(d[key]), el => el.child(div().text_size(11).text_color(t.blocked).child('Enter a color as #RRGGBB or use Choose.')));
  }

  modes() {
    return group('ki-mode', MODES, this.draft.kind, mode => {
      this.draft.kind = mode; this.page = 0; this.error = '';
      this.importRequest++; this.importing = false;
    });
  }

  tile(id, label, items, index, selected, choose, content) {
    const kind = id.startsWith('ki-icon-') ? 'icon' : 'emoji';
    const active = items.includes(selected) ? items.indexOf(selected) : 0;
    return Button.new(id).track_focus(this.gridHandles[kind][index]).tab_index(0).tab_stop(index === active)
      .accessibility_label(label + (items[index] === selected ? ', selected' : '')).tooltip(label).size(38).rounded(7).flex().items_center().justify_center()
      .border_1().border_color(items[index] === selected ? theme().accent : theme().border)
      .bg(items[index] === selected ? theme().selected : theme().popover).cursor_pointer().hover(s => s.bg(theme().hover))
      .on_click((_e, cx) => { choose(items[index]); cx.notify(); })
      .on_key_down((e, cx) => {
        const delta = { left: -1, right: 1, up: -11, down: 11 }[e.key];
        const next = e.key === 'home' ? 0 : e.key === 'end' ? items.length - 1 : delta === undefined ? null : Math.max(0, Math.min(items.length - 1, index + delta));
        if (next !== null) { choose(items[next]); this.gridHandles[kind][next].focus(); cx.stop_propagation(); cx.notify(); }
      }).child(content);
  }

  iconMatches() {
    const names = LIBRARIES[this.draft.library] ?? ICONS;
    const filtered = this.category === 'all' ? names : CATEGORIES[this.draft.library]?.[this.category] ?? [];
    const popular = filterIcons(names, '');
    const matches = this.query.trim() ? filterIcons(filtered, this.query) : this.category !== 'all' || this.browse === 'all' ? filtered : popular.length ? popular : names.slice(0, 33);
    return { names, matches };
  }

  iconGrid() {
    const t = theme();
    const { names, matches } = this.iconMatches();
    const pageSize = 66;
    const count = Math.max(1, Math.ceil(matches.length / pageSize));
    this.page = Math.min(this.page, count - 1);
    const items = matches.slice(this.page * pageSize, (this.page + 1) * pageSize);
    const rows = [];
    for (let i = 0; i < items.length; i += 11) rows.push(h_flex().id(`ki-icon-grid-row-${i / 11}`).gap(5).children(items.slice(i, i + 11).map((name, j) =>
      this.tile(`ki-icon-${name}`, `${this.draft.library}: ${name}`, items, i + j, this.draft.name, name => { this.draft.name = name; },
        avatar({ ...this.draft, name, background: this.draft.background ?? contrastBacking(this.draft.color, t.popover) }, '', null, 30)))));
    return v_flex().gap(8)
      .child(group('ki-library', [['lucide', 'Lucide'], ['feather', 'Feather'], ['hugeicons', 'Hugeicons Free']], this.draft.library, library => {
          this.draft.library = library; this.page = 0;
          this.category = 'all';
          if (!LIBRARIES[library].includes(this.draft.name)) this.draft.name = LIBRARIES[library][0];
        }))
      .child(h_flex().gap(6).items_center()
        .child(group('ki-browse', [['popular', 'Popular'], ['all', `All (${names.length})`]], this.browse, browse => { this.browse = browse; this.category = 'all'; this.page = 0; this.query = ''; this.search.set_value(''); }))
        .child(this.categories()))
      .child(this.field(this.search, 'ki-search', `Search all ${ICONS.length} Lucide icons…`))
      .child(h_flex().justify_between().items_center()
        .child(div().id('ki-catalogue-status').text_size(11).text_color(t.muted).child(`${this.category !== 'all' ? this.category.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()) : this.query.trim() ? 'Search' : this.browse === 'all' ? 'All icons' : 'Popular icons'} · ${matches.length} ${this.query.trim() ? 'matches' : 'icons'}`))
        .child(this.label(this.draft.name)))
      .child(v_flex().gap(5).children(rows))
      .when(!items.length, el => el.child(this.label('No icons found.')))
      .when(count > 1, el => el.child(h_flex().gap(8).items_center().justify_end()
        .child(this.button('ki-prev', 'Previous', () => { this.page--; }, false, this.page === 0))
        .child(this.label(`${this.page + 1} / ${count}`))
        .child(this.button('ki-next', 'Next', () => { this.page++; }, false, this.page >= count - 1))));
  }

  emojiGrid() {
    const rows = [];
    for (let i = 0; i < EMOJIS.length; i += 11) rows.push(h_flex().gap(5).children(EMOJIS.slice(i, i + 11).map((emoji, j) =>
      this.tile(`ki-emoji-${i + j}`, `${EMOJI_NAMES[i + j]} ${emoji}`, EMOJIS, i + j, this.draft.emoji,
        emoji => { this.draft.emoji = emoji; this.emojiInput.set_value(emoji); }, avatar({ ...this.draft, kind: 'emoji', emoji }, '', null, 30)))));
    return v_flex().gap(9).children(rows)
      .child(this.label('Or paste any emoji, including flags and combined emoji'))
      .child(this.field(this.emojiInput, 'ki-custom-emoji', 'Paste an emoji'))
      .when(this.touched.emoji && firstEmoji(this.draft.emoji) !== this.draft.emoji, el => el.child(div().id('ki-emoji-error').text_size(11).text_color(theme().blocked).child('Paste one complete emoji.')));
  }

  categories() {
    const categories = CATEGORIES[this.draft.library] ?? {};
    const choose = key => { this.category = key; this.browse = 'all'; this.page = 0; this.categoryOpen = false; };
    const title = key => key === 'all' ? 'All categories' : key.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
    const list = Object.keys(categories).filter(key => key.includes(this.categoryQuery.trim().toLowerCase().replace(/\s+/g, '-')));
    const panel = v_flex().w(250).p(10).gap(7).rounded(8).border_1().border_color(theme().border).bg(theme().popover)
      .child(this.field(this.categoryInput, 'ki-category-search'))
      .child(this.button('ki-category-all', 'All categories', () => choose('all'), this.category === 'all'))
      .child(v_flex().h(230).overflow_y_scrollbar().gap(2).children(list.map(key =>
        this.button(`ki-category-${key}`, `${title(key)} (${categories[key].length})`, () => choose(key), this.category === key).flex_none())));
    return Popover.new('ki-categories').open(Boolean(this.categoryOpen))
      .on_open_change((open, cx) => { this.categoryOpen = open; cx.notify(); })
      .trigger(Button.new('ki-category-trigger').tab_index(0).accessibility_label(`Category: ${title(this.category)}`).h(30).px(10).items_center().rounded(7).border_1().border_color(theme().border).bg(theme().raised).cursor_pointer()
        .child(div().max_w(175).truncate().text_size(12).text_color(theme().foreground).child(title(this.category) + ' ▾')))
      .content(panel);
  }

  moveIcon(dx, dy, cx) {
    if (this.draft.kind === 'emoji') return this.moveEmoji(dx, dy, cx);
    const key = transformKey(this.draft), a = this.draft.adjustments[key] ?? { x: 0, y: 0, scale: 100 };
    this.draft.adjustments[key] = { ...a, x: Math.max(-8, Math.min(8, a.x + dx)), y: Math.max(-8, Math.min(8, a.y + dy)) };
    cx.notify();
  }

  resizeIcon(delta, cx) {
    const key = transformKey(this.draft), a = this.draft.adjustments[key] ?? { x: 0, y: 0, scale: 100 };
    this.draft.adjustments[key] = { ...a, scale: Math.max(50, Math.min(150, a.scale + delta)) };
    cx.notify();
  }

  resetIcon(cx) {
    if (this.draft.kind === 'emoji') this.resetEmoji(cx);
    this.draft.adjustments[transformKey(this.draft)] = { x: 0, y: 0, scale: 100 };
    cx.notify();
  }

  moveEmoji(dx, dy, cx) {
    const emoji = this.draft.emoji;
    const offset = this.draft.emojiOffsets[emoji] ?? { x: 0, y: 0 };
    this.draft.emojiOffsets[emoji] = { x: Math.max(-8, Math.min(8, offset.x + dx)), y: Math.max(-8, Math.min(8, offset.y + dy)) };
    cx.notify();
  }

  resetEmoji(cx) {
    this.draft.emojiOffsets[this.draft.emoji] = { x: 0, y: 0 };
    cx.notify();
  }

  emojiAdjustment() {
    const t = theme(), d = this.draft;
    const adjustment = this.draft.adjustments[transformKey(this.draft)] ?? { x: 0, y: 0, scale: 100 };
    const offset = this.draft.kind === 'emoji' ? this.draft.emojiOffsets[this.draft.emoji] ?? { x: 0, y: 0 } : adjustment;
    const arrow = (id, text, dx, dy) => this.button(`ki-adjust-${id}`, text, cx => this.moveIcon(dx, dy, cx)).accessibility_label(`Move icon ${id} one pixel`);
    const panel = v_flex().w(290).p(12).gap(8).rounded(9).border_1().border_color(t.border).bg(t.popover).text_color(t.foreground)
        .child(h_flex().id('ki-sidebar-previews').gap(16).items_center()
          .child(h_flex().gap(7).items_center().child(d.kind === 'herdr' ? herdrAvatar(this.space?.name, this.id) : avatar(d, this.space?.name, this.info.automatic, 22)).child(this.label(d.kind === 'herdr' ? 'Expanded · 18 px' : 'Expanded · 22 px')))
          .child(h_flex().gap(7).items_center().child(d.kind === 'herdr' ? div().text_size(13).child(String(Math.max(0, spaces().findIndex(s => s.id === this.id)) + 1)) : avatar(d, this.space?.name, this.info.automatic, 20)).child(this.label(d.kind === 'herdr' ? 'Compact · number' : 'Compact · 20 px'))))
      .child(this.label('Position · 1 px in sidebar'))
      .child(h_flex().justify_center().child(arrow('up', '↑', 0, -1)))
      .child(h_flex().gap(8).justify_center().items_center()
        .child(arrow('left', '←', -1, 0))
        .child(avatar(this.draft, this.space?.name, this.info.automatic, 32))
        .child(arrow('right', '→', 1, 0)))
      .child(h_flex().justify_center().child(arrow('down', '↓', 0, 1)))
      .child(div().text_size(12).child(`X: ${offset.x} px   Y: ${offset.y} px`))
      .child(h_flex().gap(8).items_center().justify_between()
        .child(this.button('ki-size-minus', '−', cx => this.resizeIcon(-5, cx), false, adjustment.scale <= 50).accessibility_label('Reduce icon size by five percent'))
        .child(div().text_size(12).child(`${adjustment.scale}%`))
        .child(this.button('ki-size-plus', '+', cx => this.resizeIcon(5, cx), false, adjustment.scale >= 150).accessibility_label('Increase icon size by five percent')))
      .child(this.button('ki-adjust-reset', 'Reset', cx => this.resetIcon(cx)));
    return h_flex().gap(9).items_center()
      .child(Popover.new('ki-adjust-popover').open(Boolean(this.adjustOpen))
        .on_open_change((open, cx) => { this.adjustOpen = open; cx.notify(); })
        .trigger(Button.new('ki-adjust').tab_index(0).accessibility_label('Adjust icon size and position').h(30).px(10).items_center().rounded(7).border_1().border_color(t.border).bg(t.raised).text_color(t.foreground).text_size(12).cursor_pointer().hover(s => s.bg(t.hover)).child('Adjust'))
        .content(panel));
  }

  images() {
    return v_flex().gap(8)
      .child(this.label('Drop an image here, choose a project image, or enter a local file path'))
      .child(h_flex().gap(8).child(div().flex_1().child(this.field(this.imageInput, 'ki-image-path', 'C:\\project\\icon.png')))
        .child(this.button('ki-image-import', this.importing ? 'Importing…' : 'Import', cx => this.importImage(this.imagePath, cx), false, this.importing)))
      .child(this.label(this.loading ? 'Finding project images…' : this.info.message ?? `${this.info.files.length} project images${this.info.limited ? ' (list limited to 200)' : ''}`))
      .child(this.label('Hover a file or press P while focused to preview it (up to 12 per dialog).'))
      .child(v_flex().h(160).flex_none().overflow_y_scrollbar().children(this.info.files.map((file, i) =>
        Button.new(`ki-file-${i}`).tab_index(0).accessibility_label(`Import ${file.relative}`).tooltip(file.path).h(36).flex_none().px(8).gap(8).items_center().rounded(5).hover(s => s.bg(theme().hover)).cursor_pointer()
          .on_hover((hovered, cx) => { if (hovered) this.thumbnail(file.path, cx); })
          .on_key_down((e, cx) => { if (e.key === 'p') { this.thumbnail(file.path, cx); cx.stop_propagation(); } })
          .on_click((_e, cx) => { this.importImage(file.path, cx); cx.notify(); })
          .child(this.thumbnails[file.path] ? image(this.thumbnails[file.path]).size(26).flex_none() : div().size(26).flex_none().text_color(theme().muted).child('▧'))
          .child(div().truncate().child(file.relative)))))
      .when(Boolean(this.draft.image), el => el.child(div().id('ki-image-source').truncate().tooltip(this.imageSource || this.draft.image).text_size(11).text_color(theme().muted)
        .child(`Ready: ${this.imageSource || this.draft.image}`)));
  }

  thumbnail(path, cx) {
    if (this.thumbnailRequests.has(path) || this.thumbnailRequests.size >= 12) return;
    this.thumbnailRequests.add(path);
    cx.spawn(async cx => {
      try { this.thumbnails[path] = (await assetAction('Import', path)).path; }
      catch { /* A failed preview never changes the draft or import error. */ }
      cx.notify();
    });
  }

  content() {
    if (this.draft.kind === 'herdr') return v_flex().gap(8)
      .child(this.label('Restore the original Herdr sidebar marker.'))
      .child(this.label('Save clears this space’s custom icon, background and adjustments.'));
    if (this.draft.kind === 'lucide') return this.iconGrid();
    if (this.draft.kind === 'emoji') return this.emojiGrid();
    if (['auto', 'image'].includes(this.draft.kind) && this.info.available === false) return v_flex().gap(8)
      .child(this.label(this.info.message))
      .child(this.label('Install Node.js 22+ and run npm install in the installed mods/kolczyk/node-helper folder.'))
      .child(this.button('ki-helper-retry', 'Check again', cx => this.reload(cx)));
    if (this.draft.kind === 'image') return this.images();
    if (this.draft.kind === 'monogram') {
      const invalid = !/^[\p{L}\p{N}]{1,2}$/u.test(this.draft.text.normalize('NFKC').trim().toUpperCase());
      return v_flex().gap(5).child(this.label('Letters'))
        .child(this.field(this.letters, 'ki-monogram', 'AB').when(invalid && this.touched.monogram, el => el.border_color(theme().blocked)))
        .child(div().id(invalid && this.touched.monogram ? 'ki-monogram-error' : 'ki-monogram-hint').text_size(11)
          .text_color(invalid && this.touched.monogram ? theme().blocked : theme().muted).child('Use one or two letters or numbers.'));
    }
    return v_flex().gap(8)
      .child(this.label(this.loading ? 'Looking for the project favicon…' : this.info.message ?? (this.info.source ? `Favicon: ${this.info.source}` : 'No favicon found — using the space monogram.')))
      .child(this.label('Uses the project’s local favicon when available, otherwise its initials.'))
      .child(this.button('ki-refresh', this.loading ? 'Scanning…' : 'Refresh favicon', cx => this.reload(cx), false, this.loading));
  }

  render() {
    const t = theme(), d = this.draft;
    const invalid = validateDraft(d) || (!spaces().some(s => s.id === this.id) ? 'This space is no longer available.' : '');
    const error = [this.error, invalid].filter(Boolean).join(' ');
    const iconCount = d.kind === 'lucide' ? this.iconMatches().matches.length : 0;
    const catalogueExtra = Math.max(0, Math.min(6, Math.ceil(iconCount / 11)) - 3) * 43 + (iconCount > 66 ? 38 : 0);
    const bodyHeight = ({ herdr: 100, auto: 365, lucide: 550 + catalogueExtra, emoji: 400, monogram: 370, image: 440 + (d.image ? 24 : 0) })[d.kind] ?? 420;
    return v_flex().id('kolczyk-picker').track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx))
      .w_full().h(Math.min(bodyHeight + 190, Math.max(0, window.viewport_size().height - 32))).min_h(0).p(20).gap(14).bg(t.popover).text_color(t.foreground).text_size(12)
      .on_drop((event, cx) => { if (event.paths?.length) { d.kind = 'image'; this.importImage(event.paths[0], cx); cx.notify(); } })
      .child(h_flex().h(48).flex_none().gap(12).items_center()
        .child(div().id('ki-preview').child(d.kind === 'herdr' ? herdrAvatar(this.space?.name, this.id, 48) : avatar(d, this.space?.name, this.info.automatic, 48)))
        .child(v_flex().flex_1().gap(4).child(div().text_size(17).font_semibold().child('Choose space icon'))
          .child(div().text_color(t.muted).truncate().child(this.space?.name ?? 'Space is no longer available')))
        .when(d.kind !== 'herdr', el => el.child(this.emojiAdjustment())))
      .child(this.modes())
      .child(v_flex().id('ki-picker-body').flex_1().min_h(0).gap(14).overflow_y_scrollbar()
        .child(this.content().flex_none())
        .when(['lucide', 'monogram', 'auto'].includes(d.kind), el => el.child(this.colors(false)))
        .when(d.kind !== 'herdr', el => el.child(div().h(1).bg(t.border)).child(this.colors(true)))
        .when(d.kind !== 'herdr', el => el.child(h_flex().min_h(30).flex_none().gap(8).items_center().child(this.label('Shape'))
          .child(group('ki-shape', [['circle', 'Circle'], ['square', 'Square'], ['rounded', 'Rounded square']], d.shape, shape => { d.shape = shape; })))))
      .when(Boolean(error), el => el.child(div().id('ki-save-error').flex_none().text_size(11).text_color(t.blocked).child(error)))
      .child(h_flex().h(30).flex_none().gap(8).justify_end()
        .child(this.button('ki-cancel', 'Cancel', () => closeOverlay(props()?.overlay)))
        .child(this.button('ki-save', 'Save icon', () => this.save(), true, Boolean(invalid) || this.importing || !this.space || (d.kind === 'auto' && this.info.available === false))));
  }
}
