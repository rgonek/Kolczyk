import { exec, appHome } from 'herdr';

export async function assetAction(action, path) {
  let result;
  try { result = await exec('node', [`${appHome()}/mods/kolczyk/node-helper/main.mjs`, action, path, appHome()]); }
  catch (cause) { throw new Error(`Automatic and Image need the optional Node helper. Other icon types work without it. See the README for setup. ${cause.message ?? cause}`); }
  if (result.code === 78) {
    const error = new Error('Automatic and Image need the optional Node helper. Other icon types work without it. See the README for setup.');
    error.helperUnavailable = true;
    throw error;
  }
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'Could not read the image.');
  return JSON.parse(result.stdout.replace(/^\uFEFF/, '').trim());
}

export async function projectAssets(folder, machine, { images = true } = {}) {
  if (machine) return { automatic: null, source: null, files: [], message: 'Automatic discovery reads local projects only. You can choose an icon, emoji, monogram or local image for this remote space.' };
  if (!folder) return { automatic: null, source: null, files: [], message: 'No project folder is available. Automatic uses a monogram.' };
  let root = folder;
  try {
    const git = await exec('git', ['rev-parse', '--show-toplevel'], { cwd: folder });
    if (git.code === 0 && git.stdout.trim()) root = git.stdout.trim();
  } catch { /* Non-git folder or git not installed: inspect the folder itself. */ }
  try { return { ...await assetAction(images ? 'Scan' : 'Discover', root), root }; }
  catch (error) {
    if (error.helperUnavailable || error.message.includes('optional Node helper')) return { automatic: null, files: [], available: false, message: error.message, root };
    throw error;
  }
}
