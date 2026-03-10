/**
 * @fileoverview 書き取りツール（Dictation Tool）のメインロジック。
 * 音声プレイヤーの制御、キーボードショートカット、および
 * スクリーンリーダー向けのアクセシビリティ通知を管理します。
 */

import { handleKeydown } from './player.ts';
import { DEFAULT_SHORTCUTS } from './shortcuts.ts';

/** 音声再生用のHTMLAudioElement */
const player = document.getElementById('player') as HTMLAudioElement;

/** テキスト入力用のHTMLTextAreaElement */
const editor = document.getElementById('editor') as HTMLTextAreaElement;

/** 音声ファイルを選択するためのHTMLInputElement */
const audioInput = document.getElementById('audioFile') as HTMLInputElement;

/** スクリーンリーダーへの通知を行うためのライブリージョン（div要素） */
const statusRegion = document.getElementById('status-region') as HTMLDivElement;

/**
 * 指定されたメッセージをスクリーンリーダーに通知します。
 * aria-live="polite" が設定された領域の内容を更新することで読み上げを発生させます。
 * * @param {string} message - 通知する文字列
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
 * 選択されたファイルをプレイヤーにセットし、エディタへフォーカスを移動します。
 */
audioInput.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    if (player.src.startsWith('blob:')) {
      URL.revokeObjectURL(player.src);
    }

    const url = URL.createObjectURL(file);
    player.src = url;

    announce("音声を読み込みました。入力エリアに移動します。");
    editor.focus();
  }
});

editor.addEventListener('keydown', (e: KeyboardEvent) => {
  handleKeydown(e, player, DEFAULT_SHORTCUTS, announce);
});
