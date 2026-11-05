export const state = { props: {}, shared: {}, overlays: [], closed: [], commands: [], spaces: [{ id: 'local-space', name: 'Sheep', folder: 'D:/project', machine: null, tabs: [] }], tasks: [] };
export class View {}
export class Element {
  constructor(type = 'div') {
    this.type = type; this.nodes = []; this.values = {}; this.handlers = {};
    return new Proxy(this, { get: (obj, key, receiver) => {
      if (key in obj) return obj[key];
      return (...args) => {
        if (String(key).startsWith('on_')) { obj.handlers[key] = args.at(-1); if (key === 'on_change') obj.handlers.on_click = (e, cx) => args.at(-1)(true, cx); }
        else if (key === 'trigger' || key === 'content') obj.nodes.push(args[0]);
        else obj.values[key] = args;
        return receiver;
      };
    } });
  }
  child(node) { if (node !== undefined && node !== null) this.nodes.push(node); return this; }
  children(nodes) { nodes.forEach(n => this.child(n)); return this; }
  when(condition, fn) { return condition ? fn(this) : this; }
  hover() { return this; }
}
export const div = () => new Element();
export const h_flex = () => new Element('row');
export const v_flex = () => new Element('column');
export const svg = path => { const el = new Element('svg'); el.path = path; return el; };
export const image = path => { const el = new Element('image'); el.path = path; return el; };
const component = type => ({ new: id => { const el = new Element(type); el.values.id = [id]; return el; } });
export const Popover = component('popover');
export const Button = component('button');
export const Radio = component('radio');
export const RadioGroup = component('radiogroup');
export const Slider = component('slider');
export const SliderTrack = component('track');
export const SliderIndicator = component('indicator');
export const SliderThumb = component('thumb');
export const SliderState = { new: ({ value = 0 } = {}) => ({ current: value, value() { return this.current; }, set_value(v) { this.current = v; }, on() {} }) };
export const PathBuilder = { fill: () => new Element('path') };
export const Background = { linear_gradient: () => ({}) };
globalThis.window = { paint_path: () => new Element('paint'), viewport_size: () => ({ width: 1280, height: state.viewportHeight ?? 1000 }) };
export const Input = { new: input => { const el = new Element('input'); el.input = input; return el; } };
export const InputState = { new: ({ value = '' } = {}) => {
  const events = {};
  return { text: value, value() { return this.text; }, on(event, fn) { events[event] = fn; }, set_value(value) { this.text = value; events.change?.({}, cx); }, focus() {}, set_selected_range() {} };
} };
export const props = () => state.props;
export const shared = key => { if (state.sharedReads) state.sharedReads[key] = (state.sharedReads[key] ?? 0) + 1; return structuredClone(state.shared[key]); };
export const setShared = (key, value) => { state.shared[key] = structuredClone(value); };
export const spaces = () => state.spaces;
export const panes = () => [];
export const machines = () => [];
export const theme = () => new Proxy({}, { get: () => '#888888' });
export const window = () => ({ active: true, platform: 'windows' });
export const layout = () => ({ id: 'sidebar', size: { px: state.width ?? 268 } });
export const appHome = () => 'C:/app';
export const openOverlay = value => { state.overlays.push(value); };
export const closeOverlay = id => { state.closed.push(id); };
export const run = (name, args) => { state.commands.push({ name, args }); };
export const notify = () => {};
export const keys = () => [];
export const nextCommand = () => new Promise(() => {});
export const focused = () => ({ space: state.spaces[0]?.id });
export const terminals = () => [];
export const watchFolder = () => new Promise(() => {});
export const hc = async () => ({ code: 0, stdout: '{"machines":[]}' });
export const exec = async (command, args) => state.exec ? state.exec(command, args) : command === 'git'
  ? { code: 1, stdout: '', stderr: 'not a git repository' }
  : { code: 0, stdout: JSON.stringify(args.includes('Import') ? { path: 'assets/kolczyk/abc.png' } : { automatic: null, files: [] }), stderr: '' };
export const cx = {
  notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() {} }),
  timer: { every() {}, after() {} },
  spawn(fn) { const task = Promise.resolve().then(() => fn(cx)); state.tasks.push(task); return task; },
  new(Class, p) { const view = new Class(); view.init?.(p, cx); return view; },
};
export function find(element, id) {
  if (element?.values?.id?.[0] === id) return element;
  for (const node of element?.nodes ?? []) { const found = find(node, id); if (found) return found; }
  return null;
}
globalThis.localStorage = { getItem: () => null, setItem() {} };
