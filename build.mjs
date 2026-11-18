// Build a downloadable edition that can be played directly from disk.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const embedMusic = args.includes('--embed-music');
const output = resolve(args.find(arg => arg !== '--embed-music') || join(project, 'dist', 'index.html'));
const read = name => readFileSync(join(project, name), 'utf8');
const mime = { '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function embed(name) {
  const type = mime[extname(name)];
  if (!type) throw new Error('Unsupported game asset ' + name);
  return 'data:' + type + ';base64,' + readFileSync(join(project, name)).toString('base64');
}

const portraits = {};
for (const filename of readdirSync(join(project, 'art'))) {
  if (filename.endsWith('.png')) portraits[filename.slice(0, -4)] = embed('art/' + filename);
}
for (const file of readdirSync(join(project, 'art', 'familiars'))) {
  if (file.endsWith('.png')) portraits['familiars/' + file.slice(0, -4)] = embed('art/familiars/' + file);
}
const scripts = ['window.CWEmbeddedArt = ' + JSON.stringify(portraits) + ';'];
const soundtrack = { play: 'table.mp3', menu: 'rewards.wav', boss: 'boss.mp3' };
if (embedMusic) {
  const music = {};
  for (const [scene, name] of Object.entries(soundtrack)) {
    const asset = 'music/' + name;
    if (existsSync(join(project, asset))) music[scene] = embed(asset);
  }
  scripts.push('window.CWEmbeddedMusic = ' + JSON.stringify(music) + ';');
}
let html = read('index.html').replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) => {
  const css = read(name).replace(/url\("([^"]+)"\)/g, (_, path) => 'url("' + embed(path) + '")');
  return '<style>\n' + css + '\n</style>';
}).replace(/<script defer src="([^"]+)"><\/script>/g, (_, name) => {
  scripts.push(read(name));
  return '';
}).replace(/(src|href)="((?:art|assets)\/[^"]+)"/g, (_, attr, path) => attr + '="' + embed(path) + '"');
html = html.replace('</body>', () => '<script>\n' + scripts.join('\n;\n').replace(/<\/script/gi, '<\\/script') + '\n</script>\n</body>');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
const musicDir = join(project, 'music');
if (!embedMusic && existsSync(musicDir)) {
  const destination = join(dirname(output), 'music');
  if (destination !== musicDir) {
    mkdirSync(destination, { recursive: true });
    for (const file of Object.values(soundtrack).filter(name => existsSync(join(musicDir, name)))) {
      copyFileSync(join(musicDir, file), join(destination, file));
    }
  }
}
console.log(output);
