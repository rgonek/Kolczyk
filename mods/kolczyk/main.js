import { props, nextCommand, focused, openOverlay } from 'herdr';
import Spaces from './spaces.js';
import Menu from './menu.js';
import Folders from './folders.js';
import Picker from './picker.js';

export default class Kolczyk extends Spaces {
  init(_props, cx) {
    const p = props() ?? {};
    if (p.mode === 'picker' || p.mode === 'menu' || p.mode === 'folders') {
      this.overlayContent = cx.new(p.mode === 'picker' ? Picker : p.mode === 'folders' ? Folders : Menu, p);
      return;
    }
    // Herdr invalidates the mod root when shared state changes. Keep the sidebar
    // on that root; a retained child would otherwise keep its cached description.
    super.init(_props, cx);
    cx.spawn(async cx => {
      for (;;) {
        const command = await nextCommand();
        if (command === 'icon') {
          const space = focused()?.space;
          const parent = this.ordered().find(row => row.w.id === space)?.parent?.id;
          openOverlay({ mod: 'kolczyk', kind: 'dialog', width: 520, props: { mode: 'picker', space, parent } });
        }
      }
    });
  }
  render() { return this.overlayContent ?? super.render(); }
}
