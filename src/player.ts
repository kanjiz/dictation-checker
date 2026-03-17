import type { ShortcutConfig } from './shortcuts.ts';
import { matches, isMac } from './keyboard.ts';

/**
 * キーダウンイベントをショートカット設定に従って処理する。
 *
 * @param event     - 発火したキーボードイベント
 * @param player    - 操作対象の音声プレイヤー
 * @param shortcuts - ショートカット設定
 * @param announce  - スクリーンリーダー通知関数
 * @param mac       - Mac パスで判定するか（デフォルト: `isMac`）
 */
export function handlePlayerKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  shortcuts: ShortcutConfig,
  announce: (message: string) => void,
  mac = isMac,
): void {
  if (matches(event, shortcuts.playPause, mac)) {
    event.preventDefault();
    if (player.paused) {
      void player.play();
      announce('再生');
    } else {
      player.pause();
      announce('停止');
    }
  } else if (matches(event, shortcuts.seekBack, mac)) {
    event.preventDefault();
    player.currentTime = Math.max(0, player.currentTime - 10);
    announce('10秒戻る');
  } else if (matches(event, shortcuts.seekForward, mac)) {
    event.preventDefault();
    player.currentTime = Math.min(player.duration, player.currentTime + 10);
    announce('10秒進む');
  }
}
