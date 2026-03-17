import type { ShortcutKey, ShortcutConfig } from './shortcuts.ts';

/**
 * 実行環境が Mac かどうか。
 *
 * jsdom（テスト環境）では `navigator.userAgent` に "Mac" が含まれないため `false` になる。
 * これにより、テストでは ctrlKey パスが自動的に使われる。
 */
export const isMac: boolean = /Mac/.test(navigator.userAgent);

/**
 * キーボードイベントがショートカット定義にマッチするかを判定する。
 *
 * @param event    - 判定対象のキーボードイベント
 * @param shortcut - ショートカット定義
 * @param mac      - Mac パスで判定するか（デフォルト: `isMac`）。
 *                   テストから明示的に渡すことで Mac/非 Mac 両パスを検証可能。
 * @returns ショートカットの条件をすべて満たすとき `true`
 */
export function matches(
  event: KeyboardEvent,
  shortcut: ShortcutKey,
  mac = isMac,
): boolean {
  const modifierPressed = mac ? event.metaKey : event.ctrlKey;
  return modifierPressed === shortcut.modifier && event.key === shortcut.key;
}

/**
 * `KeyboardEvent.key` の値をユーザー向け表示文字列に変換するマップ。
 * マップにない値はそのまま表示する。
 */
const keyDisplayMap: Readonly<Record<string, string>> = {
  ArrowLeft:  '←',
  ArrowRight: '→',
  Enter:      'Enter',
};

/**
 * ページ内の `<kbd>` 要素とエディタ要素を、現在の OS とショートカット設定に合わせて更新する。
 *
 * 冪等な設計になっており、設定変更時に再呼び出しして表示を更新できる。
 *
 * - `<kbd data-mod>` — 修飾キーラベル（Mac: `⌘`、Windows/Linux: `Ctrl`）に更新
 * - `<kbd data-key="<name>">` — ショートカット名に対応するキーラベルに更新
 * - `#editor[aria-keyshortcuts]` — OS に応じた修飾キープレフィックスで更新
 * - `#editor[placeholder]` — 修飾キーラベルを含む案内文に更新
 *
 * @param shortcuts - 表示に反映するショートカット設定
 */
export function updateShortcutDisplay(shortcuts: ShortcutConfig, mac = isMac): void {
  const modifierLabel  = mac ? '⌘'    : 'Ctrl';
  const modifierPrefix = mac ? 'Meta' : 'Control';

  document.querySelectorAll<HTMLElement>('kbd[data-mod]').forEach((el) => {
    el.textContent = modifierLabel;
  });

  const shortcutsByName = shortcuts as Record<string, ShortcutKey>;
  document.querySelectorAll<HTMLElement>('kbd[data-key]').forEach((el) => {
    const name = el.dataset['key'] ?? '';
    if (name in shortcutsByName) {
      const rawKey = shortcutsByName[name]?.key ?? name;
      el.textContent = keyDisplayMap[rawKey] ?? rawKey;
    }
  });

  const editor = document.getElementById('editor');
  if (editor !== null) {
    const keyShortcuts = Object.values(shortcuts)
      .map((s) => `${modifierPrefix}+${s.key}`)
      .join(' ');
    editor.setAttribute('aria-keyshortcuts', keyShortcuts);
    editor.setAttribute('placeholder', `${modifierLabel} + Enter で再生・一時停止`);
  }
}
