// Development-only: inputs downloaded from official upstream sources into .tmp.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ICONS } from '../mods/kolczyk/catalogue.js';
import { FEATHER, HUGEICONS } from '../mods/kolczyk/libraries.js';
const cache = new Map();
function resolveCategories(name, seen = new Set()) {
  if (cache.has(name)) return cache.get(name);
  if (seen.has(name)) return [];
  seen.add(name);
  const path = `.tmp/lucide-source/lucide-main/icons/${name}.json`;
  const values = existsSync(path) ? JSON.parse(readFileSync(path)).categories ?? [] : [];
  const result = [...new Set(values.flatMap(value => value.startsWith('$extends:') ? resolveCategories(value.slice(9), new Set(seen)) : [value]))];
  cache.set(name, result);
  return result;
}
const lucide = Object.fromEntries(ICONS.map(name => [name, resolveCategories(name)]));
const huge = new Map(JSON.parse(readFileSync('.tmp/hugeicons-index.json')).icons.map(icon => [icon.name, icon.category]));
const result = {};
for (const [pack, names] of Object.entries({ lucide: ICONS, feather: FEATHER, hugeicons: HUGEICONS })) {
  const groups = {};
  for (const name of names) {
    const categories = pack === 'hugeicons' ? [huge.get(name)].filter(Boolean) : lucide[name] ?? lucide[name.replace(/-\d+$/, '')] ?? [];
    for (const category of categories.length ? categories : ['other']) (groups[category] ??= []).push(name);
  }
  result[pack] = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
}
writeFileSync('mods/kolczyk/categories.js', '// Offline upstream category snapshot, 2026-11-02. Feather categories mapped from matching Lucide names.\nexport const CATEGORIES = ' + JSON.stringify(result) + ';\n');
console.log(Object.fromEntries(Object.entries(result).map(([k,v]) => [k, Object.keys(v).length])));
