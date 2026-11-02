import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const helper = resolve('mods/kolczyk/node-helper/main.mjs');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>';
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'kolczyk-test-'));
  const project = join(dir, 'project with spaces');
  const home = join(dir, 'app');
  mkdirSync(project); mkdirSync(home);
  const put = (path, content = svg) => { mkdirSync(resolve(project, path, '..'), { recursive: true }); writeFileSync(join(project, path), content); };
  const run = (action = 'Scan', path = project) => JSON.parse(execFileSync(process.execPath, [helper, action, path, home], { encoding: 'utf8' }).trim());
  try { fn({ dir, project, home, put, run }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('explicit t3 icon wins, imports by content and returns project images', () => fixture(({ put, run, home }) => {
  put('favicon.svg'); put('assets/custom.svg', svg.replace('red', 'blue'));
  put('t3.json', JSON.stringify({ iconPath: 'assets/custom.svg' }));
  const result = run();
  assert.match(result.automatic, /^assets\/kolczyk\/[a-f0-9]+\.svg$/);
  assert.match(readFileSync(join(home, result.automatic), 'utf8'), /blue/);
  assert.ok(result.files.some(f => f.relative === 'assets/custom.svg'));
}));

test('HTML icon precedes standard favicon and deleted source falls back', () => fixture(({ put, run, project, home }) => {
  put('favicon.svg'); put('public/brand.svg', svg.replace('red', 'green'));
  put('index.html', '<link href="/brand.svg?v=1" rel="icon">');
  const first = run();
  assert.match(readFileSync(join(home, first.automatic), 'utf8'), /green/);
  rmSync(join(project, 'public/brand.svg'));
  const next = run();
  assert.notEqual(next.automatic, first.automatic);
  rmSync(join(project, 'favicon.svg'));
  assert.equal(run().automatic, null);
}));

test('lightweight discovery imports the automatic icon without listing project images', () => fixture(({ put, run }) => {
  put('favicon.svg');
  put('assets/other.svg');
  const result = run('Discover');
  assert.match(result.automatic, /^assets\/kolczyk\/[a-f0-9]+\.svg$/);
  assert.equal(result.source, 'favicon.svg');
  assert.deepEqual(result.files, []);
  assert.equal(result.limited, false);
}));

test('config traversal and URLs cannot escape project; bad image is ignored', () => fixture(({ dir, put, run }) => {
  writeFileSync(join(dir, 'outside.svg'), svg);
  put('t3.json', '{"iconPath":"../outside.svg"}');
  put('index.html', '<link rel="icon" href="https://example.com/a.svg">');
  put('favicon.png', 'not an image');
  assert.equal(run().automatic, null);
}));

test('manual import is copied and missing source fails clearly', () => fixture(({ put, run, project, home }) => {
  put('my icon.svg');
  const result = run('Import', join(project, 'my icon.svg'));
  rmSync(join(project, 'my icon.svg'));
  assert.equal(readFileSync(join(home, result.path), 'utf8'), svg);
  assert.throws(() => run('Import', join(project, 'missing.png')));
}));

test('PNG and favicon ICO import as readable PNG assets', () => fixture(({ put, run, project, home }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = 1; header[7] = 1; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  put('icon.png', png); put('favicon.ico', Buffer.concat([header, png]));
  for (const file of ['icon.png', 'favicon.ico']) {
    const result = run('Import', join(project, file));
    assert.match(result.path, /\.png$/);
    assert.equal(readFileSync(join(home, result.path)).subarray(1, 4).toString(), 'PNG');
  }
}));

test('SVG import rejects external XML and CSS dependencies and keeps local fragments', () => fixture(({ put, run, project }) => {
  const wrap = content => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${content}</svg>`;
  const external = [
    '<image href="./photo.png"/>',
    '<image xlink:href="../photo.png"/>',
    '<image href="https:&#47;&#47;example.com/photo.png"/>',
    '<image href="data:image/png;base64,AA=="/>',
    '<rect style="fill: url(./paint.svg#color)"/>',
    '<style>rect { fill: url("../paint.svg#color"); }</style>',
    '<style>@import "./theme.css";</style>',
    '<style>@im/**/port "./theme.css";</style>',
    '<style>rect { fill: u\\72l(./paint.svg); }</style>',
    '<style>@font-face { font-family: icon; src: local("Personal Font"); }</style>',
    '<script>alert(1)</script>',
    '<foreignObject/>',
    '<rect onload="alert(1)"/>',
    '<animate attributeName="href" to="./photo.png"/>',
    '<g xml:base="https://example.com/"><use href="#shape"/></g>',
  ];
  for (const [index, content] of external.entries()) {
    const name = `external-${index}.svg`;
    put(name, wrap(content));
    assert.throws(() => run('Import', join(project, name)), undefined, content);
  }
  put('local.svg', wrap('<defs><linearGradient id="paint"/><path id="shape" d="M0 0h1"/></defs><use xlink:href="#shape" fill="url(#paint)"/><style>use { stroke: url("#paint"); }</style>'));
  assert.match(run('Import', join(project, 'local.svg')).path, /\.svg$/);
}));

test('uninstalled optional package reports exit 78 rather than requiring PowerShell', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kolczyk-no-package-'));
  try {
    const standalone = join(dir, 'main.mjs'); writeFileSync(standalone, readFileSync(helper));
    assert.throws(() => execFileSync(process.execPath, [standalone, 'Discover', dir, dir], {stdio:'pipe'}), error => error.status === 78 && /not installed/.test(String(error.stderr)));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('discovery rejects linked project files and bounds oversized imports', () => fixture(({ dir, project, put, run }) => {
  const outside = join(dir, 'outside'); mkdirSync(outside); writeFileSync(join(outside, 'brand.svg'), svg);
  symlinkSync(outside, join(project, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  put('t3.json', JSON.stringify({iconPath:'linked/brand.svg'}));
  assert.equal(run().automatic, null);
  assert.equal(run().files.some(file => file.relative.startsWith('linked/')), false);
  put('huge.png', Buffer.alloc(2*1024*1024+1));
  assert.throws(() => run('Import',join(project,'huge.png')));
}));

test('uncompressed 32-bit ICO and 24-bit BMP become valid PNG assets', () => fixture(({ put, run, project, home }) => {
  const dib=Buffer.alloc(48); dib.writeUInt32LE(40); dib.writeInt32LE(1,4); dib.writeInt32LE(2,8); dib.writeUInt16LE(1,12); dib.writeUInt16LE(32,14); dib.set([0,0,255,255],40);
  const header=Buffer.alloc(22); header.writeUInt16LE(1,2); header.writeUInt16LE(1,4); header[6]=1; header[7]=1; header.writeUInt32LE(dib.length,14); header.writeUInt32LE(22,18);
  put('dib.ico',Buffer.concat([header,dib]));
  const bmp=Buffer.alloc(58); bmp.write('BM'); bmp.writeUInt32LE(58,2); bmp.writeUInt32LE(54,10); bmp.writeUInt32LE(40,14); bmp.writeInt32LE(1,18); bmp.writeInt32LE(1,22); bmp.writeUInt16LE(1,26); bmp.writeUInt16LE(24,28); bmp.set([0,0,255,0],54);
  put('tiny.bmp',bmp);
  for (const file of ['dib.ico','tiny.bmp']) {
    const result=run('Import',join(project,file));
    assert.equal(readFileSync(join(home,result.path)).subarray(1,4).toString(),'PNG');
  }
}));
