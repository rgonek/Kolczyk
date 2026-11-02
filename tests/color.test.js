import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsv, hsvToHex, luminance, contrastBacking } from '../mods/kolczyk/color.js';

test('catalogue contrast uses luminance and actual theme backing', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#ffffff'), 1);
  for (const color of ['#00ffff', '#ffff00', '#888888']) {
    assert.equal(contrastBacking(color, color), '#000000');
    assert.equal(contrastBacking(color, '#000000'), null);
  }
  assert.equal(contrastBacking('#222222', '#222222'), '#ffffff');
  assert.equal(contrastBacking('#ffffff', '#123456'), null);
});
test('HSV picker round trips colors and clamps coordinates', () => {
  for (const color of ['#ffffff', '#000000', '#a78bfa', '#2563eb', '#00ffff', '#ff0000']) {
    const { h, s, v } = hexToHsv(color);
    assert.equal(hsvToHex(h, s, v), color);
  }
  assert.equal(hsvToHex(0, 2, 2), '#ff0000');
});
