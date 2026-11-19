import { View, div, svg } from 'gpui-kit';
import { v_flex, h_flex, Input, InputState } from 'gpui-base';
import { props, spaces, theme, shared, setShared, openOverlay, closeOverlay } from 'herdr';
import { button } from './controls.js';

export const DEFAULT_FOLDER_ICON = { kind: 'lucide', name: 'folder', colorSwatch: 'Violet' };

const key = 'kolczyk.folders';
export const folderState = () => shared(key) ?? { folders: [], membership: {} };
const update = change => {
  const state = folderState();
  const next = change(state);
  if (next !== state) setShared(key, next);
};

export function moveToFolder(space, folder) {
  update(state => {
    const machine = spaces().find(s => s.id === space);
    if (!machine || (folder && !state.folders.some(f => f.id === folder && f.machine === (machine.machine ?? null)))) return state;
    if ((state.membership[space] ?? null) === folder) return state;
    const membership = { ...state.membership };
    if (folder) membership[space] = folder;
    else delete membership[space];
    return { ...state, membership };
  });
}

export function groupRows(rows, folders, membership, machine) {
  const groups = new Map(folders.filter(f => f.machine === machine).map(f => [f.id, { folder: f, rows: [] }]));
  const ungrouped = [];
  for (const row of rows) {
    const group = groups.get(membership[row.parent?.id ?? row.w.id]);
    (group?.rows ?? ungrouped).push(row);
  }
  return { groups: [...groups.values()], ungrouped };
}

export function changeFolder(id, change) {
  update(state => ({ ...state, folders: state.folders.map(f => f.id === id ? { ...f, ...change } : f) }));
}

export function folderDialog(action, options = {}, kind = 'dialog') {
  openOverlay({ mod: 'kolczyk', kind, width: kind === 'popup' ? 230 : 360, height: action === 'new' || action === 'rename' ? 132 : 360,
    props: { mode: 'folders', action, ...options } });
}

export default class Folders extends View {
  init(_props, cx) {
    const folder = folderState().folders.find(f => f.id === props()?.folder);
    this.name = InputState.new({ value: folder?.name ?? '', placeholder: 'Folder name' });
    if (['new', 'rename'].includes(props()?.action)) {
      this.name.focus();
      cx.timer.after(0, () => this.name.focus());
    }
  }

  render() {
    const { action, folder: id, space, machine = null, overlay } = props();
    const t = theme(), state = folderState(), folder = state.folders.find(f => f.id === id);
    const close = () => closeOverlay(overlay);
    const jump = (next, options) => { close(); folderDialog(next, options); };
    const panel = v_flex().id('kolczyk-folders').w_full().p(12).gap(8).bg(t.popover).text_color(t.foreground);
    const popup = ['settings', 'menu', 'move'].includes(action);
    if (popup) panel.p(5).gap(0).text_size(12.8);
    const row = (id, label, fn, icon) => h_flex().id(id).h(31).flex_none().px(8).gap(9).rounded(7)
      .items_center().text_color(t.foreground).hover(style => style.bg(t.hover))
      .on_click(() => fn())
      .child(icon ? svg(icon).size(14).flex_none().text_color(t.muted) : div().size(14).flex_none())
      .child(div().flex_1().truncate().child(label));
    const item = (id, label, fn, icon) => panel.child(row(id, label, fn, icon));
    const icons = 'mods/kolczyk/icons/';
    if (action === 'settings') return item('kf-show-button', 'Show New Folder button', () => {
      update(current => ({ ...current, showButton: !(current.showButton ?? true) }));
      close();
    }, (state.showButton ?? true) ? icons + 'check.svg' : undefined);
    if ((action === 'menu' || action === 'rename') && !folder) return item('kf-unavailable', 'Folder is no longer available', close);
    if (action === 'menu') {
      item('kf-rename', 'Rename folder…', () => jump('rename', { folder: id }), icons + 'pencil.svg');
      item('kf-icon', 'Change icon and color…', () => {
        close();
        openOverlay({ mod: 'kolczyk', kind: 'dialog', width: 520, props: { mode: 'picker', folder: id } });
      }, icons + 'image.svg');
      return item('kf-remove', 'Remove folder', () => {
        update(current => ({ ...current, folders: current.folders.filter(f => f.id !== id),
          membership: Object.fromEntries(Object.entries(current.membership).filter(([, folder]) => folder !== id)) }));
        close();
      }, icons + 'x.svg');
    }
    if (action === 'move') {
      item('kf-create', 'New folder…', () => jump('new', { space, machine }), icons + 'folder-plus.svg');
      if (state.membership[space]) item('kf-ungroup', 'Remove from folder', () => { moveToFolder(space, null); close(); }, icons + 'folder-minus.svg');
      const destinations = state.folders.filter(f => f.machine === machine).map(f =>
        row('kf-move-' + f.id, f.name, () => { moveToFolder(space, f.id); close(); }, icons + 'folder.svg'));
      return destinations.length > 7
        ? panel.child(v_flex().h(217).overflow_y_scrollbar().children(destinations))
        : panel.children(destinations);
    }
    const save = () => {
      const name = this.name.value().trim();
      if (!name) return;
      if (action === 'rename') changeFolder(id, { name });
      else update(current => {
        if (space && !spaces().some(s => s.id === space && (s.machine ?? null) === machine)) return current;
        let folderId = 'folder-' + Date.now();
        while (current.folders.some(f => f.id === folderId)) folderId += '-';
        return { ...current, folders: [...current.folders, { id: folderId, machine, name }],
          membership: space ? { ...current.membership, [space]: folderId } : current.membership };
      });
      close();
    };
    return panel.h(126).child(div().font_semibold().child(action === 'rename' ? 'Rename folder' : 'New folder'))
      .child(Input.new(this.name).id('kf-name').accessibility_label('Folder name').w_full().h(32).px(8).rounded(6).border_1().border_color(t.input).bg(t.background).text_color(t.foreground))
      .child(h_flex().justify_end().gap(6).child(button('kf-cancel', 'Cancel', close))
        .child(button('kf-save', action === 'rename' ? 'Save' : 'Create folder', save, true)));
  }
}
