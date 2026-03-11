import { defineConfig, type Plugin } from 'vite';

/**
 * ビルド出力を file:// プロトコルで動作するよう変換する Vite プラグイン。
 *
 * Vite はデフォルトで `<script type="module" crossorigin>` と
 * `<link rel="stylesheet" crossorigin>` を出力するが、
 * file:// では origin が null になり Chrome の CORS ポリシーに引っかかる。
 *
 * - script: `type="module" crossorigin` → `defer`
 *   （type="module" は暗黙的に defer されるため、明示的に補う）
 * - link:   `crossorigin` 属性を削除
 */
function fileProtocolCompat(): Plugin {
  return {
    name: 'file-protocol-compat',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [fileProtocolCompat()],
});
