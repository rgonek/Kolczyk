import { exec, appHome } from 'herdr';

export async function assetAction(action, path) {
  const result = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', `${appHome()}/mods/kolczyk/assets.ps1`, '-Action', action, '-Path', path, '-AppHome', appHome()]);
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
  return { ...await assetAction(images ? 'Scan' : 'Discover', root), root };
}
