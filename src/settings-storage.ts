// src/settings-storage.ts
import type { Settings } from './settings.ts';
import { DEFAULT_SETTINGS } from './settings.ts';

const STORAGE_KEY = 'settings';
const CURRENT_VERSION = 1;

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as Record<string, unknown>;
    return parseSettings(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  const data = { version: CURRENT_VERSION, shortcuts: settings.shortcuts, seek: settings.seek };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportSettings(settings: Settings): void {
  const data = { version: CURRENT_VERSION, shortcuts: settings.shortcuts, seek: settings.seek };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importSettings(
  file: File,
  onSuccess: (settings: Settings) => void,
  onError: (message: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const data = JSON.parse(text) as Record<string, unknown>;
      const settings = parseSettings(data);
      saveSettings(settings);
      onSuccess(settings);
    } catch (err) {
      onError(err instanceof Error ? err.message : '不明なエラー');
    }
  };
  reader.readAsText(file);
}

// --- バリデーション ---

const SHORTCUT_KEYS = ['playPause', 'seekBack', 'seekForward', 'download'] as const;

function parseSettings(data: Record<string, unknown>): Settings {
  if (data['version'] !== CURRENT_VERSION) {
    throw new Error(`未対応のバージョンです: ${String(data['version'])}`);
  }

  const shortcuts = data['shortcuts'];
  if (typeof shortcuts !== 'object' || shortcuts === null) {
    throw new Error('shortcuts が不正です');
  }
  const sc = shortcuts as Record<string, unknown>;

  // 必須キーの存在チェック
  for (const key of SHORTCUT_KEYS) {
    if (!(key in sc)) throw new Error(`shortcuts.${key} が存在しません`);
    const entry = sc[key] as Record<string, unknown>;
    if (typeof entry['key'] !== 'string') throw new Error(`shortcuts.${key}.key が不正です`);
    if (typeof entry['modifier'] !== 'boolean') throw new Error(`shortcuts.${key}.modifier が不正です`);
  }

  // 重複チェック
  const pairs = SHORTCUT_KEYS.map(k => {
    const e = sc[k] as { key: string; modifier: boolean };
    return `${e.key}:${String(e.modifier)}`;
  });
  if (new Set(pairs).size !== pairs.length) {
    throw new Error('ショートカットキーが重複しています');
  }

  const seek = data['seek'];
  if (typeof seek !== 'object' || seek === null) throw new Error('seek が不正です');
  const sk = seek as Record<string, unknown>;
  if (typeof sk['backSeconds'] !== 'number' || sk['backSeconds'] <= 0) {
    throw new Error('seek.backSeconds は正の数値でなければなりません');
  }
  if (typeof sk['forwardSeconds'] !== 'number' || sk['forwardSeconds'] <= 0) {
    throw new Error('seek.forwardSeconds は正の数値でなければなりません');
  }

  return {
    shortcuts: {
      playPause:   sc['playPause']   as { key: string; modifier: boolean },
      seekBack:    sc['seekBack']    as { key: string; modifier: boolean },
      seekForward: sc['seekForward'] as { key: string; modifier: boolean },
      download:    sc['download']    as { key: string; modifier: boolean },
    },
    seek: {
      backSeconds:    sk['backSeconds']    as number,
      forwardSeconds: sk['forwardSeconds'] as number,
    },
  };
}
