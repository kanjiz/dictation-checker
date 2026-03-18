import type { Settings } from './settings.ts';
import { matches, isMac } from './keyboard.ts';

/**
 * キーダウンイベントをショートカット設定に従って処理し、音声プレイヤーを操作する。
 *
 * @param event     - 発火したキーボードイベント
 * @param player    - 操作対象の音声プレイヤー
 * @param settings  - アプリ設定（ショートカット + seek 秒数）
 * @param announce  - スクリーンリーダー通知関数
 * @param mac       - Mac パスで判定するか（デフォルト: `isMac`）
 */
export function handlePlayerKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  settings: Settings,
  announce: (message: string) => void,
  mac = isMac,
): void {
  if (matches(event, settings.shortcuts.playPause, mac)) {
    event.preventDefault();
    if (player.paused) {
      void player.play();
      announce('再生');
    } else {
      player.pause();
      announce('停止');
    }
  } else if (matches(event, settings.shortcuts.seekBack, mac)) {
    event.preventDefault();
    player.currentTime = Math.max(0, player.currentTime - settings.seek.backSeconds);
    announce(`${settings.seek.backSeconds}秒戻る`);
  } else if (matches(event, settings.shortcuts.seekForward, mac)) {
    event.preventDefault();
    player.currentTime = Math.min(player.duration, player.currentTime + settings.seek.forwardSeconds);
    announce(`${settings.seek.forwardSeconds}秒進む`);
  }
}
