import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('failed native check restores installed mod and leaves layout untouched', { skip: process.platform !== 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'kolczyk-install-'));
  const home = join(dir, 'home'); const bin = join(dir, 'bin');
  mkdirSync(join(home, 'mods/kolczyk'), { recursive: true });
  mkdirSync(join(home, 'layouts')); mkdirSync(bin);
  const original = '{"id":"root","children":[{"id":"spaces","content":{"mod":"kolczyk"}}]}';
  writeFileSync(join(home, 'layouts/custom.json'), original);
  writeFileSync(join(home, 'mods/kolczyk/mod.json'), '{"kolczyk_version":"test"}');
  writeFileSync(join(home, 'mods/kolczyk/main.js'), 'old working version');
  writeFileSync(join(bin, 'herdr-app.cmd'), '@echo off\r\necho intentional check failure\r\nexit /b 1\r\n');
  try {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('scripts/install.ps1'), '-AppHome', home], { encoding: 'utf8', env: { ...process.env, PATH: bin + ';' + process.env.PATH } });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(home, 'layouts/custom.json'), 'utf8'), original);
    assert.equal(readFileSync(join(home, 'mods/kolczyk/main.js'), 'utf8'), 'old working version');
    assert.equal(existsSync(join(home, 'mods/kolczyk/picker.js')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
