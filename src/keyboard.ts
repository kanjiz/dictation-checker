import type { ShortcutKey, Settings } from './settings.ts';

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
 * ページ内の `<kbd>` 要素、エディタ要素、seek 秒数 span を現在の設定に合わせて更新する。
 *
 * @param settings - 表示に反映する設定
 * @param mac      - Mac パスで表示を更新するか（デフォルト: `isMac`）
 */
export function updateShortcutDisplay(settings: Settings, mac = isMac): void {
  const modifierLabel  = mac ? '⌘'    : 'Ctrl';
  const modifierPrefix = mac ? 'Meta' : 'Control';

  document.querySelectorAll<HTMLElement>('kbd[data-mod]').forEach((el) => {
    el.textContent = modifierLabel;
  });

  const shortcuts = settings.shortcuts as Record<string, ShortcutKey>;
  document.querySelectorAll<HTMLElement>('kbd[data-key]').forEach((el) => {
    const name = el.dataset['key'] ?? '';
    if (name in shortcuts) {
      const rawKey = shortcuts[name]?.key ?? name;
      el.textContent = keyDisplayMap[rawKey] ?? rawKey;
    }
  });

  const editor = document.getElementById('editor');
  if (editor !== null) {
    const keyShortcuts = Object.values(settings.shortcuts)
      .map((s) => `${modifierPrefix}+${s.key}`)
      .join(' ');
    editor.setAttribute('aria-keyshortcuts', keyShortcuts);
    editor.setAttribute('placeholder', `${modifierLabel} + Enter で再生・一時停止`);
  }

  // seek 秒数の表示を更新
  const backEl = document.querySelector<HTMLElement>('[data-seek="back"]');
  if (backEl) backEl.textContent = String(settings.seek.backSeconds);

  const forwardEl = document.querySelector<HTMLElement>('[data-seek="forward"]');
  if (forwardEl) forwardEl.textContent = String(settings.seek.forwardSeconds);
}
