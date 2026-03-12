import type { ShortcutConfig } from './shortcuts.ts';

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

/** Ctrl+S キーダウンイベントを処理してテキストをダウンロードする */
export function handleDownloadKeydown(
  event: KeyboardEvent,
  editor: HTMLTextAreaElement,
  downloadStatus: HTMLElement,
  shortcuts: ShortcutConfig,
  announce: (message: string) => void,
): void {
  // stub placeholder — implemented in Task 5
}
