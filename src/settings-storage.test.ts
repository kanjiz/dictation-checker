// src/settings-storage.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSettings, saveSettings, exportSettings, importSettings } from './settings-storage.ts';
import { DEFAULT_SETTINGS } from './settings.ts';
import type { Settings } from './settings.ts';

beforeEach(() => {
  localStorage.clear();
});

// --- loadSettings ---

describe('loadSettings()', () => {
  it('localStorage が空のとき DEFAULT_SETTINGS を返す', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('正常な JSON をパースして返す', () => {
    const stored = { version: 1, shortcuts: DEFAULT_SETTINGS.shortcuts, seek: DEFAULT_SETTINGS.seek };
    localStorage.setItem('settings', JSON.stringify(stored));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('壊れた JSON のとき DEFAULT_SETTINGS を返す', () => {
    localStorage.setItem('settings', 'not-json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

// --- saveSettings ---

describe('saveSettings()', () => {
  it('localStorage に version・shortcuts・seek を書き込む', () => {
    saveSettings(DEFAULT_SETTINGS);
    const stored = JSON.parse(localStorage.getItem('settings')!);
    expect(stored.version).toBe(1);
    expect(stored.shortcuts).toEqual(DEFAULT_SETTINGS.shortcuts);
    expect(stored.seek).toEqual(DEFAULT_SETTINGS.seek);
  });
});

// --- exportSettings ---

describe('exportSettings()', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let capturedAnchor: HTMLAnchorElement | undefined;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const original = document.createElement.bind(document);
    capturedAnchor = undefined;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag);
      if (tag === 'a') capturedAnchor = el as HTMLAnchorElement;
      return el;
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.mocked(document.createElement).mockRestore();
  });

  it('settings.json という名前でダウンロードが発火する', () => {
    exportSettings(DEFAULT_SETTINGS);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(capturedAnchor?.download).toBe('settings.json');
  });
});

// --- importSettings ---

describe('importSettings()', () => {
  function makeFile(content: string): File {
    return new File([content], 'settings.json', { type: 'application/json' });
  }

  function validJson(): string {
    return JSON.stringify({
      version: 1,
      shortcuts: DEFAULT_SETTINGS.shortcuts,
      seek: DEFAULT_SETTINGS.seek,
    });
  }

  it('正常ファイル → onSuccess が呼ばれ localStorage に保存される', async () => {
    const file = makeFile(validJson());
    const result = await new Promise<Settings>((resolve, reject) => {
      importSettings(file, resolve, (msg) => reject(new Error(msg)));
    });
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('壊れた JSON → onError が呼ばれ localStorage は変更されない', async () => {
    const file = makeFile('not-json');
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
    expect(localStorage.getItem('settings')).toBeNull();
  });

  it('version が 1 以外 → onError が呼ばれる', async () => {
    const file = makeFile(JSON.stringify({ version: 2, shortcuts: DEFAULT_SETTINGS.shortcuts, seek: DEFAULT_SETTINGS.seek }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });

  it('shortcuts が 3 件（不足）→ onError が呼ばれる', async () => {
    const { download: _omit, ...partialShortcuts } = DEFAULT_SETTINGS.shortcuts;
    const file = makeFile(JSON.stringify({ version: 1, shortcuts: partialShortcuts, seek: DEFAULT_SETTINGS.seek }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });

  it('shortcuts に重複キーがある → onError が呼ばれる', async () => {
    const duplicateShortcuts = {
      ...DEFAULT_SETTINGS.shortcuts,
      seekBack: { key: 'Enter', modifier: true }, // playPause と重複
    };
    const file = makeFile(JSON.stringify({ version: 1, shortcuts: duplicateShortcuts, seek: DEFAULT_SETTINGS.seek }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });

  it('seek.backSeconds が 0 → onError が呼ばれる', async () => {
    const file = makeFile(JSON.stringify({
      version: 1,
      shortcuts: DEFAULT_SETTINGS.shortcuts,
      seek: { backSeconds: 0, forwardSeconds: 10 },
    }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });

  it('shortcuts のエントリに key フィールドがない → onError が呼ばれる', async () => {
    const malformedShortcuts = {
      ...DEFAULT_SETTINGS.shortcuts,
      playPause: { modifier: true }, // key フィールドなし
    };
    const file = makeFile(JSON.stringify({ version: 1, shortcuts: malformedShortcuts, seek: DEFAULT_SETTINGS.seek }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });

  it('seek.forwardSeconds が 0 → onError が呼ばれる', async () => {
    const file = makeFile(JSON.stringify({
      version: 1,
      shortcuts: DEFAULT_SETTINGS.shortcuts,
      seek: { backSeconds: 10, forwardSeconds: 0 },
    }));
    const error = await new Promise<string>((resolve, reject) => {
      importSettings(file, (_s) => reject(new Error('unexpected success')), resolve);
    });
    expect(error).toBeTruthy();
  });
});
