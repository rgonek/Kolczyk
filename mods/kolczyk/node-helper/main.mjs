import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const LIMIT = 2 * 1024 * 1024;
const extensions = new Set(['.svg', '.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
if (Number(process.versions.node.split('.')[0]) < 22) { console.error('The optional helper requires Node.js 22 or newer.'); process.exit(78); }
let sharp, XMLParser, XMLValidator, bmp;
try {
  sharp = (await import('sharp')).default;
  bmp = (await import('bmp-js')).default;
  ({ XMLParser, XMLValidator } = await import('fast-xml-parser'));
} catch {
  console.error('Optional image helper is not installed. Run npm install in mods/kolczyk/node-helper.');
  process.exit(78);
}

function localCss(value) {
  const css = String(value).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi,
    (_, hex, literal) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : literal);
  if (/@import\b|\blocal\s*\(/i.test(css)) throw Error('SVG must be self-contained: external CSS resources are not supported.');
  const rest = css.replace(/\burl\s*\(\s*(?:"#[^"\s()]+"|'#[^'\s()]+'|#[^\s()"']+)\s*\)/gi, '');
  if (/\burl\s*\(/i.test(rest)) throw Error('SVG must be self-contained: use local fragment references only.');
}

function validateSvg(bytes) {
  const text = bytes.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i.test(text) || XMLValidator.validate(text) !== true) throw Error('Invalid or unsupported SVG XML.');
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true }).parse(text);
  if (!Object.hasOwn(parsed, 'svg')) throw Error('Invalid SVG image.');
  const visit = (node, tag = '') => {
    if (['script', 'foreignobject', 'animate', 'animatetransform', 'set'].includes(tag.split(':').at(-1).toLowerCase())) throw Error('SVG must contain no scripts or changing resource references.');
    if (node === null || typeof node !== 'object') { if (tag === 'style') localCss(node); return; }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@_')) {
        const name = key.slice(2), local = name.split(':').at(-1).toLowerCase();
        if (name === 'xmlns' || name.startsWith('xmlns:')) continue;
        if (/^on/i.test(local) || local === 'base') throw Error('SVG must contain no scripts or changing resource references.');
        if (['href', 'src'].includes(local) && !/^#[^\s]+$/.test(String(value).trim())) throw Error('SVG must be self-contained: use local fragment references only.');
        localCss(value);
      } else if (Array.isArray(value)) value.forEach(item => visit(item, key));
      else visit(value, key === '#text' ? tag : key);
    }
  };
  visit(parsed);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  const length = Buffer.alloc(4), tail = Buffer.alloc(4);
  length.writeUInt32BE(data.length); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, tail]);
}

function icoImage(bytes) {
  if (bytes.length < 22 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) throw Error('Invalid ICO image.');
  const count = bytes.readUInt16LE(4), entries = [];
  if (count < 1 || count > 256 || bytes.length < 6 + count * 16) throw Error('Invalid ICO directory.');
  for (let i = 0; i < count; i++) {
    const p = 6 + i * 16, size = bytes.readUInt32LE(p + 8), offset = bytes.readUInt32LE(p + 12);
    if (offset >= 6 + count * 16 && offset + size <= bytes.length) entries.push({ size, offset, area: (bytes[p] || 256) * (bytes[p + 1] || 256) });
  }
  for (const entry of entries.sort((a, b) => b.area - a.area)) {
    const b = bytes.subarray(entry.offset, entry.offset + entry.size);
    if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return b;
    // Common uncompressed 24/32-bit Windows DIB icons. Indexed variants are
    // skipped so discovery can try another candidate instead of misdecoding.
    if (b.length < 40 || b.readUInt32LE(0) !== 40 || b.readUInt32LE(16) !== 0) continue;
    const w = b.readInt32LE(4), h = b.readInt32LE(8) / 2, depth = b.readUInt16LE(14);
    if (w < 1 || w > 256 || h < 1 || h > 256 || !Number.isInteger(h) || ![24,32].includes(depth)) continue;
    const stride = Math.ceil(w * depth / 32) * 4, maskStride = Math.ceil(w / 32) * 4;
    if (b.length < 40 + stride * h) continue;
    const raw = Buffer.alloc((w * 4 + 1) * h), hasAlpha = depth === 32 && Array.from({length:h}, (_, y) => y).some(y => Array.from({length:w}, (_, x) => x).some(x => b[40 + y * stride + x * 4 + 3] !== 0));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const src = 40 + (h - 1 - y) * stride + x * depth / 8, dst = y * (w * 4 + 1) + 1 + x * 4;
      const mask = 40 + stride * h + (h - 1 - y) * maskStride + (x >> 3);
      raw[dst] = b[src + 2]; raw[dst + 1] = b[src + 1]; raw[dst + 2] = b[src];
      raw[dst + 3] = mask < b.length && (b[mask] & (128 >> (x & 7))) ? 0 : hasAlpha ? b[src + 3] : 255;
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  }
  throw Error('Unsupported ICO encoding. Choose SVG, PNG or a PNG/24/32-bit ICO.');
}

async function readBounded(file, max) {
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > max) throw Error('Choose an image smaller than 2 MiB.');
    const buffer = Buffer.alloc(max + 1);
    let total = 0;
    while (total < buffer.length) { const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null); if (!bytesRead) break; total += bytesRead; }
    if (total > max) throw Error('Image exceeds the size limit.');
    return buffer.subarray(0, total);
  } finally { await handle.close(); }
}

async function importIcon(source, home) {
  const ext = path.extname(source).toLowerCase();
  if (!extensions.has(ext)) throw Error('Supported images: SVG, PNG, ICO, JPEG, GIF, WebP and BMP.');
  let bytes = await readBounded(source, LIMIT), outExt = '.png';
  if (ext === '.svg') { validateSvg(bytes); outExt = '.svg'; }
  else {
    if (ext === '.ico') bytes = icoImage(bytes);
    let input;
    if (ext === '.bmp') {
      if (bytes.length < 54 || bytes.toString('ascii',0,2) !== 'BM') throw Error('Invalid BMP image.');
      const w = bytes.readInt32LE(18), h = bytes.readInt32LE(22);
      if (w < 1 || h < 1 || w > 4096 || h > 4096) throw Error('Image dimensions must be at most 4096 x 4096.');
      const decoded = bmp.decode(bytes), rgba = Buffer.alloc(w*h*4);
      for (let i=0;i<rgba.length;i+=4) { rgba[i]=decoded.data[i+3]; rgba[i+1]=decoded.data[i+2]; rgba[i+2]=decoded.data[i+1]; rgba[i+3]=255; }
      input = sharp(rgba,{raw:{width:w,height:h,channels:4}});
    } else input = sharp(bytes, { limitInputPixels: 4096 * 4096, failOn: 'warning' });
    const meta = await input.metadata();
    if (!meta.width || !meta.height || meta.width > 4096 || meta.height > 4096) throw Error('Image dimensions must be at most 4096 x 4096.');
    bytes = await input.png().toBuffer();
    if (bytes.length > LIMIT) throw Error('Converted image must be smaller than 2 MiB.');
  }
  const name = createHash('sha256').update(bytes).digest('hex') + outExt;
  const cache = path.join(home, 'assets', 'kolczyk');
  await fs.mkdir(cache, { recursive: true });
  const temp = path.join(cache, randomUUID() + '.tmp');
  try { await fs.writeFile(temp, bytes, {flag:'wx'}); await fs.rename(temp, path.join(cache, name)); }
  finally { await fs.unlink(temp).catch(() => {}); }
  return `assets/kolczyk/${name}`;
}

async function scan(folder, home, images) {
  const root = await fs.realpath(folder), prefix = root + path.sep;
  if (!(await fs.stat(root)).isDirectory()) throw Error('Project folder is unavailable.');
  const projectPath = async relative => {
    if (typeof relative !== 'string' || !relative.trim() || /^[a-z][a-z0-9+.-]*:|^[/\\]{2}/i.test(relative)) return null;
    const full = path.resolve(root, relative.split(/[?#]/)[0].replace(/^[/\\]+/, ''));
    if (!full.startsWith(prefix)) return null;
    // Reject symlinks in every component, including links back inside the root.
    for (let p = full; p !== root; p = path.dirname(p)) { try { if ((await fs.lstat(p)).isSymbolicLink()) return null; } catch { return null; } }
    return full;
  };
  const readSmall = async relative => { const full = await projectPath(relative); if (!full) return null; try { return (await readBounded(full, 1024 * 1024)).toString('utf8'); } catch { return null; } };
  const candidates = [];
  try { const config = JSON.parse(await readSmall('t3.json')); if (typeof config?.iconPath === 'string') candidates.push(config.iconPath); } catch {}
  for (const source of ['index.html','public/index.html','app/routes/__root.tsx','src/routes/__root.tsx','app/root.tsx']) {
    const text = await readSmall(source); if (!text) continue;
    let href;
    for (const [tag] of text.matchAll(/<link\b[^>]*>/gi)) if (/\brel\s*=\s*["'](?:icon|shortcut icon)["']/i.test(tag)) { href = tag.match(/\bhref\s*=\s*["']([^"']+)/i)?.[1]; if (href) break; }
    href ??= text.match(/rel\s*:\s*["'](?:icon|shortcut icon)["'][^}]*?href\s*:\s*["']([^"']+)/is)?.[1];
    if (href && !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) { const clean = href.replace(/^\/+/, ''); candidates.push(`public/${clean}`, clean); }
  }
  candidates.push(...['favicon.svg','favicon.ico','favicon.png','public/favicon.svg','public/favicon.ico','public/favicon.png','app/favicon.ico','app/favicon.png','app/icon.svg','app/icon.png','app/icon.ico','src/favicon.ico','src/favicon.svg','src/app/favicon.ico','src/app/icon.svg','src/app/icon.png','assets/icon.svg','assets/icon.png','assets/logo.svg','assets/logo.png','.idea/icon.svg','static/favicon.svg','static/favicon.ico','static/favicon.png']);
  let automatic = null, source = null;
  for (const candidate of candidates) { const full = await projectPath(candidate); if (full) try { automatic = await importIcon(full, home); source = candidate; break; } catch {} }
  const files = [], queue = [{dir:root,depth:0}]; let visited = 0, entries = 0;
  while (images && queue.length && files.length < 200 && visited < 1200 && entries < 12000) {
    const {dir,depth} = queue.shift(); visited++;
    let handle;
    try {
      handle = await fs.opendir(dir);
      for await (const item of handle) {
        if (++entries > 12000 || files.length >= 200) break;
        if (item.isSymbolicLink()) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) { if (depth < 4 && queue.length < 1200 && !/^(\.|node_modules$|target$|dist$|build$|bin$|obj$|vendor$|coverage$)/.test(item.name)) queue.push({dir:file,depth:depth+1}); }
        else if (item.isFile() && extensions.has(path.extname(file).toLowerCase())) { try { if ((await fs.stat(file)).size <= LIMIT) files.push({relative:path.relative(root,file).split(path.sep).join('/'),path:file}); } catch {} }
      }
    } catch {} finally { if (handle) await handle.close().catch(() => {}); }
  }
  return {automatic,source,files,limited:images && (files.length >= 200 || visited >= 1200 || entries >= 12000),available:true};
}

try {
  const [action, source, home] = process.argv.slice(2);
  if (!['Scan','Discover','Import'].includes(action) || !source || !home) throw Error('Expected Scan, Discover or Import, a path and the Herdr app home.');
  const result = action === 'Import' ? {path:await importIcon(source,home)} : await scan(source,home,action === 'Scan');
  process.stdout.write(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
