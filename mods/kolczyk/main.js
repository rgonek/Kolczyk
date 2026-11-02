import { props, nextCommand, focused, openOverlay } from 'herdr';
import Spaces from './spaces.js';
import Menu from './menu.js';
import Picker from './picker.js';

export default class Kolczyk extends Spaces {
  init(_props, cx) {
    const p = props() ?? {};
    if (p.mode === 'picker' || p.mode === 'menu') {
      this.overlayContent = cx.new(p.mode === 'picker' ? Picker : Menu, p);
      return;
    }
    // Herdr invalidates the mod root when shared state changes. Keep the sidebar
    // on that root; a retained child would otherwise keep its cached description.
    super.init(_props, cx);
    cx.spawn(async cx => {
      for (;;) {
        const command = await nextCommand();
        if (command === 'icon') openOverlay({ mod: 'kolczyk', kind: 'dialog', width: 520, props: { mode: 'picker', space: focused()?.space } });
      }
    });
  }
  render() { return this.overlayContent ?? super.render(); }
}
