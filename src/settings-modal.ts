// src/settings-modal.ts
import type { ShortcutConfig, Settings } from './settings.ts';
import { DEFAULT_SETTINGS } from './settings.ts';
import { loadSettings, saveSettings, exportSettings, importSettings } from './settings-storage.ts';

const TIME_WINDOW = 1500;
const SHORTCUT_KEYS = ['playPause', 'seekBack', 'seekForward', 'download'] as const;

const keyDisplayMap: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→' };
function displayKey(key: string): string { return keyDisplayMap[key] ?? key; }

let _isModalOpen = false;
let escCount = 0;
let lastEscTime = 0;
let currentDraft: Settings | null = null;
let activeCaptureName: keyof ShortcutConfig | null = null;
let captureKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
let escKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
let _onSave: (() => void) | null = null;
let buttonAbortController: AbortController | null = null;

export function isModalOpen(): boolean { return _isModalOpen; }

export function initSettingsModal(onSave: () => void): void {
  // 前回のリスナーをクリーンアップ
  if (escKeydownHandler) {
    document.removeEventListener('keydown', escKeydownHandler);
  }
  if (captureKeydownHandler) {
    document.removeEventListener('keydown', captureKeydownHandler, { capture: true });
    captureKeydownHandler = null;
  }

  // 既存のボタンリスナーをクリーンアップ
  buttonAbortController?.abort();
  buttonAbortController = new AbortController();

  // 状態リセット
  _isModalOpen = false;
  escCount = 0;
  lastEscTime = 0;
  activeCaptureName = null;
  currentDraft = null;
  _onSave = onSave;

  escKeydownHandler = handleEscKey;
  document.addEventListener('keydown', escKeydownHandler);

  setupModalButtons(buttonAbortController.signal);
}

function openModal(): void {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  _isModalOpen = true;
  modal.removeAttribute('hidden');
  currentDraft = loadSettings();
  populateModal(currentDraft);
}

function closeModal(): void {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  _isModalOpen = false;
  modal.setAttribute('hidden', '');
  escCount = 0;
  cancelCapture();
}

function handleEscKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (_isModalOpen) {
    closeModal();
    return;
  }
  const now = Date.now();
  if (now - lastEscTime > TIME_WINDOW) {
    escCount = 1;
  } else {
    escCount++;
  }
  lastEscTime = now;
  if (escCount >= 3) {
    openModal();
    escCount = 0;
  }
}

function populateModal(settings: Settings): void {
  SHORTCUT_KEYS.forEach((name) => {
    const btn = document.querySelector<HTMLButtonElement>(`[data-capture="${name}"]`);
    if (btn) btn.textContent = displayKey(settings.shortcuts[name].key);

    const cb = document.querySelector<HTMLInputElement>(`[data-modifier="${name}"]`);
    if (cb) cb.checked = settings.shortcuts[name].modifier;

    const errEl = document.querySelector<HTMLElement>(`[data-capture-error="${name}"]`);
    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  });

  const backInput = document.getElementById('seekBackSeconds') as HTMLInputElement | null;
  if (backInput) backInput.value = String(settings.seek.backSeconds);

  const fwdInput = document.getElementById('seekForwardSeconds') as HTMLInputElement | null;
  if (fwdInput) fwdInput.value = String(settings.seek.forwardSeconds);
}

function startCapture(name: keyof ShortcutConfig): void {
  if (activeCaptureName !== null) return;
  activeCaptureName = name;

  const btn = document.querySelector<HTMLButtonElement>(`[data-capture="${name}"]`);
  if (btn) btn.textContent = 'キャプチャ中...';

  captureKeydownHandler = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation(); // bubble phase (handleEscKey) に伝搬させない

    if (['Meta', 'Control', 'Shift', 'Alt'].includes(event.key)) {
      return; // 修飾キー単体は無視、キャプチャ継続
    }

    // キャプチャ終了
    document.removeEventListener('keydown', captureKeydownHandler!, { capture: true });
    captureKeydownHandler = null;
    activeCaptureName = null;

    if (event.key === 'Escape') {
      // キャンセル: 元のラベルに戻す
      if (currentDraft) {
        if (btn) btn.textContent = displayKey(currentDraft.shortcuts[name].key);
      }
      return;
    }

    // 重複チェック
    const newKey = event.key;
    const newModifier = currentDraft!.shortcuts[name].modifier;
    const isDuplicate = (SHORTCUT_KEYS as readonly string[]).some(
      (k) => k !== name &&
        currentDraft!.shortcuts[k as keyof ShortcutConfig].key === newKey &&
        currentDraft!.shortcuts[k as keyof ShortcutConfig].modifier === newModifier,
    );

    const errEl = document.querySelector<HTMLElement>(`[data-capture-error="${name}"]`);
    if (isDuplicate) {
      if (errEl) { errEl.hidden = false; errEl.textContent = '他のショートカットと重複しています'; }
      if (btn) btn.textContent = displayKey(currentDraft!.shortcuts[name].key);
      return;
    }

    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
    currentDraft = {
      ...currentDraft!,
      shortcuts: {
        ...currentDraft!.shortcuts,
        [name]: { ...currentDraft!.shortcuts[name], key: newKey },
      },
    };
    if (btn) btn.textContent = displayKey(newKey);
  };

  document.addEventListener('keydown', captureKeydownHandler, { capture: true });
}

function cancelCapture(): void {
  if (captureKeydownHandler) {
    document.removeEventListener('keydown', captureKeydownHandler, { capture: true });
    captureKeydownHandler = null;
  }
  activeCaptureName = null;
}

function setupModalButtons(signal: AbortSignal): void {
  document.querySelectorAll<HTMLButtonElement>('[data-capture]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset['capture'] as keyof ShortcutConfig;
      startCapture(name);
    }, { signal });
  });

  document.querySelectorAll<HTMLInputElement>('[data-modifier]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (!currentDraft) return;
      const name = cb.dataset['modifier'] as keyof ShortcutConfig;
      currentDraft = {
        ...currentDraft,
        shortcuts: {
          ...currentDraft.shortcuts,
          [name]: { ...currentDraft.shortcuts[name], modifier: cb.checked },
        },
      };
    }, { signal });
  });

  document.getElementById('saveSettings')?.addEventListener('click', () => {
    if (!currentDraft) return;
    // seek 入力値をドラフトに反映
    const backInput = document.getElementById('seekBackSeconds') as HTMLInputElement | null;
    const fwdInput = document.getElementById('seekForwardSeconds') as HTMLInputElement | null;
    const backSec = backInput ? Number(backInput.value) : currentDraft.seek.backSeconds;
    const fwdSec  = fwdInput  ? Number(fwdInput.value)  : currentDraft.seek.forwardSeconds;
    const draft = { ...currentDraft, seek: { backSeconds: backSec, forwardSeconds: fwdSec } };
    saveSettings(draft);
    _onSave?.();
    closeModal();
  }, { signal });

  document.getElementById('exportSettings')?.addEventListener('click', () => {
    if (currentDraft) exportSettings(currentDraft);
  }, { signal });

  document.getElementById('importSettingsFile')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const errorEl = document.getElementById('settings-error');
    importSettings(
      file,
      (settings) => {
        currentDraft = settings;
        populateModal(settings);
        if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
        _onSave?.();
      },
      (message) => {
        if (errorEl) { errorEl.hidden = false; errorEl.textContent = message; }
      },
    );
    (e.target as HTMLInputElement).value = '';
  }, { signal });

  document.getElementById('resetSettings')?.addEventListener('click', () => {
    currentDraft = DEFAULT_SETTINGS;
    populateModal(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    _onSave?.();
    // モーダルは閉じない
  }, { signal });
}
