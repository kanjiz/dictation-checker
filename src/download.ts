import type { ShortcutConfig } from './settings.ts';
import { isMac, matches } from './keyboard.ts';

/** ローカル時刻で dictation-YYYYMMDD-HHMMSS.txt 形式のファイル名を生成する */
export function generateFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year  = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day   = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins  = pad(date.getMinutes());
  const secs  = pad(date.getSeconds());
  return `dictation-${year}${month}${day}-${hours}${mins}${secs}.txt`;
}

/** テキストをブラウザのダウンロード機能でファイルとして保存する */
export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** モジュールスコープで非表示タイマーを保持（連打時のリセットに使用） */
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * キーダウンイベントをショートカット設定に従って処理し、テキストをダウンロードする。
 *
 * ダウンロードショートカット（Mac: ⌘+S、Windows/Linux: Ctrl+S）が押されたとき:
 * - タイムスタンプ付きファイル名でテキストエリアの内容をダウンロードする
 * - ステータス要素に「保存しました」を 2 秒間表示する（連打時はタイマーをリセット）
 * - スクリーンリーダーに「保存しました」と通知する
 *
 * @param event          - 発火したキーボードイベント
 * @param editor         - ダウンロード対象のテキストエリア
 * @param downloadStatus - ダウンロード完了を通知するステータス要素
 * @param shortcuts      - ショートカット設定
 * @param announce       - スクリーンリーダー通知関数
 * @param mac            - Mac パスで判定するか（デフォルト: `isMac`）。
 *                         テストから `false` を渡すことで OS に依存せずテスト可能。
 */
export function handleDownloadKeydown(
  event: KeyboardEvent,
  editor: HTMLTextAreaElement,
  downloadStatus: HTMLElement,
  shortcuts: ShortcutConfig,
  announce: (message: string) => void,
  mac = isMac,
): void {
  if (!matches(event, shortcuts.download, mac)) return;
  event.preventDefault();

  const filename = generateFilename(new Date());
  downloadText(editor.value, filename);
  announce('保存しました');

  downloadStatus.removeAttribute('hidden');
  downloadStatus.textContent = '保存しました';

  if (hideTimer !== null) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    downloadStatus.setAttribute('hidden', '');
    downloadStatus.textContent = '';
    hideTimer = null;
  }, 2000);
}
