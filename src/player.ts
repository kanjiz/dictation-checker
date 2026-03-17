import type { ShortcutConfig } from './shortcuts.ts';
import { matches, isMac } from './keyboard.ts';

/**
 * キーダウンイベントをショートカット設定に従って処理し、音声プレイヤーを操作する。
 *
 * 各ショートカット（Mac: ⌘、Windows/Linux: Ctrl）に応じて以下を実行する:
 * - 再生/一時停止ショートカット: 再生中なら停止、停止中なら再生
 * - 10秒戻るショートカット: currentTime を 10 秒戻す（0 以下にはならない）
 * - 10秒進むショートカット: currentTime を 10 秒進める（duration を超えない）
 *
 * @param event     - 発火したキーボードイベント
 * @param player    - 操作対象の音声プレイヤー
 * @param shortcuts - ショートカット設定
 * @param announce  - スクリーンリーダー通知関数
 * @param mac       - Mac パスで判定するか（デフォルト: `isMac`）。
 *                    テストから `false` を渡すことで OS に依存せずテスト可能。
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
