import { handlePlayerKeydown } from './player.ts';
import { handleAudioFile } from './audio.ts';
import { handleDownloadKeydown } from './download.ts';
import { updateShortcutDisplay } from './keyboard.ts';
import { loadSettings } from './settings-storage.ts';
import { initSettingsModal, isModalOpen } from './settings-modal.ts';

const player = document.getElementById('player') as HTMLAudioElement;
const editor = document.getElementById('editor') as HTMLTextAreaElement;
const audioInput = document.getElementById('audioFile') as HTMLInputElement;
const statusRegion = document.getElementById('status-region') as HTMLDivElement;
const audioError = document.getElementById('audio-error') as HTMLParagraphElement;
const downloadStatus = document.getElementById('download-status') as HTMLParagraphElement;

const announce = (message: string): void => {
  statusRegion.textContent = '';
  setTimeout(() => { statusRegion.textContent = message; }, 50);
  setTimeout(() => {
    if (statusRegion.textContent === message) statusRegion.textContent = '';
  }, 2000);
};

// localStorage から設定を読み込む（let で再代入可能にする）
let settings = loadSettings();

audioInput.addEventListener('change', (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void handleAudioFile(file, player, audioError, editor, announce, audioInput);
});

editor.addEventListener('keydown', (event: KeyboardEvent) => {
  if (isModalOpen()) return; // モーダルが開いている間は無効化
  handleDownloadKeydown(event, editor, downloadStatus, settings.shortcuts, announce);
  handlePlayerKeydown(event, player, settings, announce);
});

// 起動時に表示を初期化
updateShortcutDisplay(settings);

// モーダルを初期化: 保存時に設定を再取得・再描画
initSettingsModal(() => {
  settings = loadSettings();
  updateShortcutDisplay(settings);
});
