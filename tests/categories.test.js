import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../mods/kolczyk/categories.js';
import { ICONS } from '../mods/kolczyk/catalogue.js';
import { FEATHER, HUGEICONS } from '../mods/kolczyk/libraries.js';
test('offline categories cover installed icons without unresolved metadata references', () => {
  for (const [pack, names] of Object.entries({ lucide: ICONS, feather: FEATHER, hugeicons: HUGEICONS })) {
    const groups = CATEGORIES[pack], installed = new Set(names);
    assert.ok(Object.keys(groups).every(key => !key.startsWith('$')));
    const covered = new Set(Object.values(groups).flat());
    assert.equal(covered.size, names.length, pack);
    assert.ok([...covered].every(name => installed.has(name)));
  }
  const groupsFor = name => Object.keys(CATEGORIES.lucide).filter(group => CATEGORIES.lucide[group].includes(name));
  assert.deepEqual(groupsFor('alarm-clock-check'), groupsFor('alarm-clock'));
});
