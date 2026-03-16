import type { ShortcutKey } from './shortcuts.ts';

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
