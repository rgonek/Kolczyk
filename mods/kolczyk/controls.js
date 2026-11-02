import { div, PathBuilder, Background } from 'gpui-kit';
import { h_flex, v_flex, Button, Radio, RadioGroup, Popover, SliderState, Slider, SliderTrack, SliderIndicator, SliderThumb } from 'gpui-base';
import { theme } from 'herdr';
import { hsvToHex, hexToHsv } from './color.js';

export function button(id, label, action, selected = false, disabled = false) {
  const t = theme();
  return Button.new(id).h(30).px(10).gap(5).rounded(7).flex().items_center().justify_center()
    .tab_index(0).accessibility_label(label)
    .disabled(disabled).border_1().border_color(selected ? t.accent : t.border).bg(selected ? t.selected : t.raised)
    .text_color(disabled ? t.dim : t.foreground).text_size(12).cursor_pointer()
    .when(!disabled, el => el.hover(s => s.bg(t.hover)).on_click((_e, cx) => { action(cx); cx.notify(); }))
    .child(label);
}

export function group(id, options, value, change) {
  const t = theme();
  return RadioGroup.new(id).flex().self_start().flex_none().items_center().rounded(7).overflow_hidden().border_1().border_color(t.border)
    .children(options.map(([key, label], i) => Radio.new(`${id}-${key}`).checked(key === value)
      .accessibility_label(label)
      .h(29).px(10).flex().items_center().justify_center().text_size(12).text_color(t.foreground)
      .bg(key === value ? t.selected : t.raised).cursor_pointer().hover(s => s.bg(t.hover))
      .when(key === value, el => el.text_color(t.accent).font_medium())
      .when(i < options.length - 1, el => el.border_r(1).border_color(t.border))
      .on_change((checked, cx) => { if (checked) { change(key, cx); cx.notify(); } }).child(label)));
}

export function slider(state, id, color) {
  const segment = PathBuilder.fill().move_to(0, 0).line_to(40, 0).line_to(40, 8).line_to(0, 8).close().build();
  return Slider.new(state).tab_index(0).accessibility_label(id.replace(/^ki-/, '').replace(/-/g, ' ')).w_full().child(SliderTrack.new(state).relative().h(24).w_full().flex().items_center()
    .child(h_flex().absolute().left(0).top(8).h(8).w_full().rounded(4).overflow_hidden()
      .children([0, 60, 120, 180, 240, 300].map(h => window.paint_path(segment, Background.linear_gradient(90, hsvToHex(h, 1, 1), hsvToHex(h + 60, 1, 1))).w(40).h(8))))
    .child(SliderIndicator.new(state).relative().w_full().h(8).rounded(4).bg('#00000000')
      .range_style(fill => fill.bg('#00000000').rounded(4))
      .child(SliderThumb.new(state).id(id).size(16).rounded(8).border(2).border_color('#ffffff').bg(color).ml(-8))));
}

// Native paint paths supply smooth gradients; the hue uses gpui-base's retained slider.
export class ColorPicker {
  constructor(key, get, set) {
    this.key = key; this.get = get; this.set = set; this.hsv = hexToHsv(get()); this.open = false;
    this.hue = SliderState.new({ min: 0, max: 359, step: 1, value: this.hsv.h });
    this.saturation = SliderState.new({ min: 0, max: 100, step: 1, value: this.hsv.s * 100 });
    this.brightness = SliderState.new({ min: 0, max: 100, step: 1, value: this.hsv.v * 100 });
    this.hue.on('change', (value, cx) => { if (!this.syncing) { this.hsv.h = value; this.commit(cx); } });
    this.saturation.on('change', (value, cx) => { if (!this.syncing) { this.hsv.s = value / 100; this.commit(cx); } });
    this.brightness.on('change', (value, cx) => { if (!this.syncing) { this.hsv.v = value / 100; this.commit(cx); } });
  }
  commit(cx) {
    this.syncing = true; this.hue.set_value(this.hsv.h); this.saturation.set_value(this.hsv.s * 100); this.brightness.set_value(this.hsv.v * 100); this.syncing = false;
    this.set(hsvToHex(this.hsv.h, this.hsv.s, this.hsv.v)); cx.notify();
  }
  position(event, cx) {
    if (!event.local_position) return;
    this.hsv.s = Math.max(0, Math.min(1, event.local_position.x / 240));
    this.hsv.v = 1 - Math.max(0, Math.min(1, event.local_position.y / 140));
    this.commit(cx);
  }
  channelKey(channel, event, cx) {
    const delta = { left: -1, down: -1, right: 1, up: 1 }[event.key];
    if (delta === undefined && !['home', 'end'].includes(event.key)) return;
    const max = channel === 'h' ? 359 : 1, step = channel === 'h' ? 1 : 0.01;
    this.hsv[channel] = event.key === 'home' ? 0 : event.key === 'end' ? max : Math.max(0, Math.min(max, this.hsv[channel] + delta * step));
    this.commit(cx); cx.stop_propagation();
  }
  render() {
    const t = theme(), { h, s, v } = this.hsv;
    const rect = PathBuilder.fill().move_to(0, 0).line_to(240, 0).line_to(240, 140).line_to(0, 140).close().build();
    const field = div().id(`ki-${this.key}-sv`).relative().w(240).h(140).overflow_hidden().rounded(5)
      .child(window.paint_path(rect, Background.linear_gradient(90, '#ffffff', hsvToHex(h, 1, 1))).w(240).h(140))
      .child(window.paint_path(rect, Background.linear_gradient(180, '#00000000', '#000000')).absolute().left(0).top(0).w(240).h(140))
      .child(div().absolute().left(s * 240 - 4).top((1 - v) * 140 - 4).size(8).rounded(4).border(2).border_color('#ffffff'))
      .on_mouse_down('left', (e, cx) => { this.dragging = true; this.position(e, cx); cx.stop_propagation(); })
      .on_mouse_move((e, cx) => { if (this.dragging) this.position(e, cx); })
      .on_mouse_up('left', () => { this.dragging = false; })
      .on_hover(hovered => { if (!hovered) this.dragging = false; });
    const panel = v_flex().w(264).p(12).gap(9).rounded(9).border_1().border_color(t.border).bg(t.popover).text_color(t.foreground)
      .child(div().text_size(12).child('Choose color')).child(field)
      .child(div().text_size(11).text_color(t.muted).child('Hue'))
      .child(slider(this.hue, `ki-${this.key}-hue`, hsvToHex(h, 1, 1)).on_key_down((e, cx) => this.channelKey('h', e, cx)))
      .children([['Saturation', this.saturation, 's'], ['Brightness', this.brightness, 'v']].map(([label, state, channel]) => v_flex().gap(3)
        .child(div().text_size(11).text_color(t.muted).child(`${label} (arrow keys)`))
        .child(Slider.new(state).id(`ki-${this.key}-${label.toLowerCase()}`).tab_index(0).accessibility_label(`${this.key} ${label}`).w_full()
          .on_key_down((e, cx) => this.channelKey(channel, e, cx))
          .child(SliderTrack.new(state).h(20).w_full().bg(t.raised).rounded(5)
            .child(SliderIndicator.new(state).relative().w_full().h(20).bg(t.raised).range_style(fill => fill.bg(t.accent))
              .child(SliderThumb.new(state).size(16).bg(t.foreground).rounded(8)))))))
      .child(h_flex().gap(8).items_center().child(div().size(24).rounded(5).bg(hsvToHex(h, s, v)))
        .child(div().text_size(12).child(hsvToHex(h, s, v))));
    return Popover.new(`ki-${this.key}-picker`).open(this.open)
      .on_open_change((open, cx) => {
        this.open = open;
        if (open) { this.hsv = hexToHsv(this.get()); this.syncing = true; this.hue.set_value(this.hsv.h); this.saturation.set_value(this.hsv.s * 100); this.brightness.set_value(this.hsv.v * 100); this.syncing = false; }
        cx.notify();
      })
      .trigger(Button.new(`ki-${this.key}-choose`).tab_index(0).accessibility_label(`Choose ${this.key === 'color' ? 'symbol' : 'background'} color`).h(33).px(9).gap(7).items_center().rounded(7).border_1().border_color(t.border).bg(t.raised).cursor_pointer()
        .child(div().size(16).rounded(3).bg(/^#[a-f0-9]{6}$/i.test(this.get() ?? '') ? this.get() : t.muted))
        .child(div().text_size(12).text_color(t.foreground).child('Choose…')))
      .content(panel);
  }
}
