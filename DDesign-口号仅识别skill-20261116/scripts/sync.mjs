import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

export function syncAssets({writeRuntime = false} = {}) {
  const bindings = read('rules/component-bindings.json');
  if (bindings.registry_ref !== 'assets/asset-registry.json') throw new Error('Invalid registry reference: ' + bindings.registry_ref);
  const registry = read(bindings.registry_ref);
  const config = read('rules/layout-rules.json');
  if (registry.path_base !== 'package-root') throw new Error('Asset file paths must be relative to the package root.');
  const ids = new Set();
  for (const asset of registry.assets) {
    if (ids.has(asset.asset_id)) throw new Error('Duplicate asset id: ' + asset.asset_id);
    ids.add(asset.asset_id);
    const file = path.resolve(root, asset.file);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error('Missing/invalid asset path: ' + asset.file);
    const bytes = fs.readFileSync(file);
    if (bytes.length !== asset.byte_size) throw new Error('Asset byte size mismatch: ' + asset.asset_id);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Asset hash mismatch: ' + asset.asset_id);
  }
  for (const component of bindings.components) {
    const ref = component.asset_ref || component.font_ref;
    if (ref && !registry.assets.some(asset => asset.asset_id === ref.asset_id && asset.version === ref.version)) throw new Error('Unresolved component reference: ' + component.component_id);
  }
  const fixedIds = {brand_logo: 'didi.chuxing.logo.horizontal.reverse', brand_slogan_single_line: 'didi.chuxing.slogan.single-line.reverse'};
  for (const [componentId, assetId] of Object.entries(fixedIds)) {
    if (bindings.components.find(c => c.component_id === componentId)?.asset_ref?.asset_id !== assetId) throw new Error('Engine/brand binding mismatch: ' + componentId);
  }
  const css = fs.readFileSync(path.join(root, 'assets/brand/font-faces.css'), 'utf8');
  for (const [componentId, key] of [['activity_headline', 'headlineFamily'], ['activity_subtitle', 'subtitleFamily'], ['activity_details', 'bodyFamily']]) {
    const ref = bindings.components.find(c => c.component_id === componentId)?.font_ref;
    const font = registry.assets.find(a => a.asset_id === ref?.asset_id && a.version === ref?.version);
    if (font?.type !== 'font' || font.metadata.css_family !== config.typography[key]) throw new Error('Font binding/family mismatch: ' + componentId);
    const face = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].find(m => m[1].includes("font-family: '" + font.metadata.css_family + "'"));
    const url = face?.[1].match(/url\(['"]?([^'"\)]+)['"]?\)/)?.[1];
    if (!url || path.resolve(root, 'assets/brand', url) !== path.resolve(root, font.file)) throw new Error('Font CSS path mismatch: ' + componentId);
  }
  for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
    if (!fs.existsSync(path.resolve(root, 'assets/brand', match[1]))) throw new Error('Missing CSS font file: ' + match[1]);
  }
  const visual = bindings.components.find(c => c.component_id === 'main_visual');
  if (visual?.asset_ref || visual?.source !== 'task_input') throw new Error('Main visual must be supplied by the task.');
  if (config.typography.headlineFamily !== 'DiDi-HYQiHei-65S' || config.typography.subtitleFamily !== 'DiDi-HYQiHei-50S') throw new Error('Expected HYQiHei-65S / HYQiHei-50S.');
  if (config.export?.format !== 'png' || config.export.dpi !== 72 || config.export.densityMetadata !== 'pHYs') throw new Error('Expected PNG at 72 dpi with pHYs metadata.');
  if (!config.input?.requiredFields?.includes('title')) throw new Error('Main title must be required.');
  if (config.export.watermark !== false) throw new Error('Output must not add a watermark.');
  if (writeRuntime) {
    fs.mkdirSync(path.join(root, 'runtime'), {recursive: true});
    fs.writeFileSync(path.join(root, 'runtime/asset-registry.js'), 'window.DIDI_ASSET_REGISTRY = ' + JSON.stringify(registry) + ';\n');
    fs.writeFileSync(path.join(root, 'runtime/layout-rules.js'), 'window.DIDI_LAYOUT_CONFIG = ' + JSON.stringify(config) + ';\n');
  }
  return {registry, config, bindings};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const checkOnly = process.argv.includes('--check');
  const {registry} = syncAssets({writeRuntime: !checkOnly});
  console.log(`Validated ${registry.assets.length} brand assets, hashes, component references and font CSS.` + (checkOnly ? '' : ' Generated runtime/ for browser use.'));
}
