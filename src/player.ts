import type { ShortcutConfig, ShortcutKey } from './shortcuts.ts';

/** ショートカットキーがイベントにマッチするか判定する */
function matches(event: KeyboardEvent, shortcut: ShortcutKey): boolean {
  return event.ctrlKey === shortcut.ctrl && event.key === shortcut.key;
}

/**
 * キーダウンイベントをショートカット設定に従って処理する。
 *
 * @param event     - 発火したキーボードイベント
 * @param player    - 操作対象の音声プレイヤー
 * @param shortcuts - ショートカット設定
 * @param announce  - スクリーンリーダー通知関数
 */
export function handlePlayerKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  shortcuts: ShortcutConfig,
  announce: (message: string) => void,
): void {
  if (matches(event, shortcuts.playPause)) {
    event.preventDefault();
    if (player.paused) {
      void player.play();
      announce('再生');
    } else {
      player.pause();
      announce('停止');
    }
  } else if (matches(event, shortcuts.seekBack)) {
    event.preventDefault();
    player.currentTime = Math.max(0, player.currentTime - 10);
    announce('10秒戻る');
  } else if (matches(event, shortcuts.seekForward)) {
    event.preventDefault();
    player.currentTime = Math.min(player.duration, player.currentTime + 10);
    announce('10秒進む');
  }
}
