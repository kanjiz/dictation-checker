import type { ShortcutConfig, ShortcutKey } from './shortcuts.ts';

/** ショートカットキーがイベントにマッチするか判定する */
function matches(event: KeyboardEvent, s: ShortcutKey): boolean {
  return event.ctrlKey === s.ctrl && event.key === s.key;
}

/**
 * キーダウンイベントをショートカット設定に従って処理する。
 *
 * @param event    - 発火したキーボードイベント
 * @param player   - 操作対象の音声プレイヤー
 * @param config   - ショートカット設定
 * @param announce - スクリーンリーダー通知関数
 */
export function handleKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  config: ShortcutConfig,
  announce: (message: string) => void,
): void {
  if (matches(event, config.playPause)) {
    event.preventDefault();
    if (player.paused) {
      void player.play();
      announce('再生');
    } else {
      player.pause();
      announce('停止');
    }
  }
}
