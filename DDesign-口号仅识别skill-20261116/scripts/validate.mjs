import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {root, syncAssets} from './sync.mjs';

const {registry, config} = syncAssets();
const scope = {console, URL, Blob, Map, document: {createElement: () => ({getContext: () => null}), fonts: {load: async () => []}}};
scope.window = scope;
scope.DIDI_ASSET_REGISTRY = registry;
scope.DIDI_LAYOUT_CONFIG = config;
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root, 'engine/didi-split-layout.js'), 'utf8'), scope);
await scope.DidiLayout.ready;
const input = {title: '好时光  轻松抵达', subtitle: '滴滴打车福利  助力每次出发', customImage: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="orange"/></svg>'), splitPreset: 'M', brandPillar: 'horizontal'};
const sizes = [{w: 800, h: 1600, unit: 'mm'}, {w: 1200, h: 700, unit: 'mm'}];
for (const target of sizes) {
  const layout = scope.DidiLayout.plan(input, target);
  assert.equal(layout.valid, true, JSON.stringify(layout.issues));
  const svg = scope.DidiLayout.render(input, target);
  assert.ok(svg.includes('assets/brand/assets/logos/didi-logo.png'));
  assert.ok(svg.includes('assets/brand/assets/slogans/slogan-landscape.png'));
  assert.ok(!svg.includes('ginkgo-architecture'));
  assert.ok(!svg.includes('模板试排 · DEMO'), 'Rendered artwork must not add the former watermark.');
  for (const title of [undefined, null, '', ' \n\t', '\u3000']) {
    const blank = scope.DidiLayout.plan({...input, title}, target);
    assert.equal(blank.valid, false);
    assert.ok(blank.issues.some(issue => issue.code === 'TITLE_REQUIRED'));
  }
  const optionalBlank = scope.DidiLayout.plan({...input, subtitle: '', url: ''}, target);
  assert.equal(optionalBlank.valid, true, 'Subtitle and QR are not globally required.');
  const missing = scope.DidiLayout.plan({...input, customImage: ''}, target);
  assert.equal(missing.valid, false);
  assert.ok(missing.issues.some(issue => issue.component === 'main_visual'));
  const wrongVersion = scope.DidiLayout.plan({...input, customImage: '', mainVisualRef: {asset_id: 'missing-visual', version: '99'}}, target);
  assert.equal(wrongVersion.valid, false);
  for (const preset of config.splitPresets) {
    const base = {...input, splitPreset: preset.id};
    const normal = scope.DidiLayout.plan(base, target);
    const long = scope.DidiLayout.plan({...base, title: '城'.repeat(80)}, target);
    assert.equal(long.headline.fontSize, normal.headline.fontSize);
    assert.equal(long.valid, false);
  }
}
for (const [target, expected] of [[sizes[0], [2268, 4535]], [sizes[1], [3402, 1984]], [{w: 1080, h: 1440, unit: 'px'}, [1080, 1440]]]) {
  const pixels = scope.DidiLayout.pngSize(target);
  assert.equal(pixels.width, expected[0]);
  assert.equal(pixels.height, expected[1]);
  assert.equal(pixels.dpi, 72);
}
for (const target of [{w: 0, h: 1, unit: 'px'}, {w: 1.5, h: 2, unit: 'px'}, {w: 1, h: 2, unit: 'in'}]) assert.throws(() => scope.DidiLayout.pngSize(target));
await assert.rejects(() => scope.DidiLayout.exportPng(input, sizes[0]), /字体/);
const manifestPath = path.join(root, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, config.version);
  for (const file of manifest.current_files) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file.package_file))).digest('hex'), file.sha256, file.package_file);
}
const report = {status: 'passed', rule_version: config.version, asset_count: registry.assets.length, checks: ['Existing asset paths, byte sizes and SHA-256 hashes.', 'Versioned component references and matching font CSS paths.', 'Logo and slogan references in two layout previews.', 'Task-supplied main visual is required; missing assets are reported.', 'Fixed font sizes and overflow errors across four presets.', 'PNG 72 dpi size conversion, invalid dimensions and unloaded-font rejection.', 'Nonblank main title is required; subtitle and QR are not globally required.', 'Artwork SVG does not add the former DEMO watermark.'], manifest_check: fs.existsSync(manifestPath) ? 'passed' : 'not_present_optional', measurement_mode: 'estimated-smoke-only', browser_verification: 'not_performed_by_this_script'};
if (process.argv.includes('--report')) fs.writeFileSync(path.join(root, 'validation-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
