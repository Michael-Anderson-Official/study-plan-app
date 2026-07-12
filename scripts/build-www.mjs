// Capacitor用のweb資産コピー。index.htmlは変換せずそのままwww/へ置くだけ。
// （アプリ本体はビルド不要のVanilla JS構成を維持する。AGENTS.md参照）
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www);

// ネイティブアプリに含めるファイル・フォルダ。workerはサーバー側なので含めない。
const items = ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'img'];
for (const item of items) {
  cpSync(join(root, item), join(www, item), { recursive: true });
}
console.log('www/ built:', items.join(', '));
