import { div, svg, image } from 'gpui-kit';
import { h_flex } from 'gpui-base';
import { appearance } from './model.js';
import { shared, theme } from 'herdr';

const MARK = { ansi6: '#22a99a', ansi3: '#e3814f', ansi4: '#5b8def', ansi5: '#8b7cf6', ansi2: '#3fae6a', ansi1: '#d9649a' };

export function herdrAvatar(name, space, size = 18) {
  const color = (shared('space.colors') ?? {})[space] ?? 'ansi6';
  const fill = color.startsWith('#') ? color : MARK[color] ?? theme()[color];
  return h_flex().size(size).flex_none().rounded(size * 5 / 18).bg(fill).items_center().justify_center()
    .text_size(size * 10.5 / 18).font_bold().text_color('#ffffff').child([...String(name ?? '')][0]?.toUpperCase() ?? '?');
}

export function avatar(value, name, automatic, size = 22) {
  const a = appearance(value, name, automatic, size);
  const glyphSize = size * a.scale;
  const content = a.kind === 'lucide'
    ? svg(`mods/kolczyk/${a.library === 'lucide' ? 'icons' : `icons-${a.library}`}/${a.name}.svg`).size(glyphSize * 0.68).text_color(a.foreground)
    : a.kind === 'image'
      ? image(a.path).size(glyphSize * 0.78)
      : a.kind === 'emoji'
        ? div().relative().top(-glyphSize * 0.08).text_size(glyphSize * 0.58).line_height(`${glyphSize * 0.72}px`).child(a.text)
        : div().text_size(glyphSize * 0.43).line_height(`${glyphSize * 0.55}px`).font_semibold().text_color(a.foreground).child(a.text);
  return h_flex().size(size).flex_none().items_center().justify_center()
    .rounded(a.radius).overflow_hidden()
    .when(Boolean(a.background), el => el.bg(a.background))
    .child(div().relative().left(a.offsetX).top(a.offsetY).child(content));
}
