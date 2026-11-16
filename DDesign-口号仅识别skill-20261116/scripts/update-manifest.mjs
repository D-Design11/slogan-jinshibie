// Optional: run only when a package hash inventory is needed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root, syncAssets} from './sync.mjs';

const {config} = syncAssets();
const manifestPath = path.join(root, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {package: 'DDesign-identification-layouts', status: 'draft'};
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === '.DS_Store') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && !['manifest.json', 'validation-report.json'].includes(path.relative(root, file))) files.push({package_file: path.relative(root, file).split(path.sep).join('/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
  }
}
walk(root);
manifest.version = config.version;
manifest.current_files = files;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated optional manifest for ${files.length} files.`);
