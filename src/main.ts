/**
 * @fileoverview 書き取りツール（Dictation Tool）のメインロジック。
 * 音声プレイヤーの制御、キーボードショートカット、および
 * スクリーンリーダー向けのアクセシビリティ通知を管理します。
 */

import { handlePlayerKeydown } from './player.ts';
import { DEFAULT_SHORTCUTS } from './shortcuts.ts';
import { handleAudioFile } from './audio.ts';
import { handleDownloadKeydown } from './download.ts';
import { updateShortcutDisplay } from './keyboard.ts';

/** 音声再生用のHTMLAudioElement */
const player = document.getElementById('player') as HTMLAudioElement;

/** テキスト入力用のHTMLTextAreaElement */
const editor = document.getElementById('editor') as HTMLTextAreaElement;

/** 音声ファイルを選択するためのHTMLInputElement */
const audioInput = document.getElementById('audioFile') as HTMLInputElement;

/** スクリーンリーダーへの通知を行うためのライブリージョン（div要素） */
const statusRegion = document.getElementById('status-region') as HTMLDivElement;

/** エラーメッセージを表示するための要素 */
const audioError = document.getElementById('audio-error') as HTMLParagraphElement;

/** ダウンロード完了ステータスを表示するための要素 */
const downloadStatus = document.getElementById('download-status') as HTMLParagraphElement;

/**
 * 指定されたメッセージをスクリーンリーダーに通知します。
 * aria-live="polite" が設定された領域の内容を更新することで読み上げを発生させます。
 *
 * @param {string} message - 通知する文字列
 */
const announce = (message: string): void => {
  statusRegion.textContent = "";
  // 連続して同じメッセージが送られた場合でも確実に読み上げを発生させるための遅延
  setTimeout(() => {
    statusRegion.textContent = message;
  }, 50);

  // 通知領域の内容を一定時間後にクリア
  setTimeout(() => {
    if (statusRegion.textContent === message) {
      statusRegion.textContent = "";
    }
  }, 2000);
};

// --- イベントリスナー ---

/**
 * ファイル選択時の処理。
 * 選択されたファイルをプレイヤーにセットし、成功時はエディタへ、エラー時はファイル入力にフォーカスを移動します。
 */
audioInput.addEventListener('change', (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    void handleAudioFile(file, player, audioError, editor, announce, audioInput);
  }
});

editor.addEventListener('keydown', (event: KeyboardEvent) => {
  handleDownloadKeydown(event, editor, downloadStatus, DEFAULT_SHORTCUTS, announce);
  handlePlayerKeydown(event, player, DEFAULT_SHORTCUTS, announce);
});

// 起動時にショートカット表示を初期化
updateShortcutDisplay(DEFAULT_SHORTCUTS);
