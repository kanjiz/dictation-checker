import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { generateFilename, downloadText, handleDownloadKeydown } from './download.ts';
import { DEFAULT_SHORTCUTS } from './shortcuts.ts';

// URL.createObjectURL / revokeObjectURL は jsdom 未実装のためモック
let urlCounter = 0;
beforeAll(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockImplementation(() => `blob:mock-url-${++urlCounter}`),
    revokeObjectURL: vi.fn(),
  });
});

describe('generateFilename', () => {
  it('dictation-YYYYMMDD-HHMMSS.txt 形式の文字列を返す', () => {
    const date = new Date(2026, 2, 12, 14, 30, 22); // 2026-03-12 14:30:22 ローカル時刻
    expect(generateFilename(date)).toBe('dictation-20260312-143022.txt');
  });
});

describe('downloadText', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(URL.createObjectURL).mockClear();
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('通常テキストのダウンロード — createObjectURL と click が呼ばれる', () => {
    downloadText('hello world', 'test.txt');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('空テキストでも動作する', () => {
    downloadText('', 'empty.txt');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('ダウンロード後に revokeObjectURL でURLを解放する', () => {
    vi.mocked(URL.revokeObjectURL).mockClear();
    downloadText('text', 'test.txt');
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  });
});

describe('handleDownloadKeydown', () => {
  let editor: HTMLTextAreaElement;
  let downloadStatus: HTMLParagraphElement;
  let announce: ReturnType<typeof vi.fn<(message: string) => void>>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    editor = document.createElement('textarea');
    editor.value = 'テスト書き取り内容';
    downloadStatus = document.createElement('p');
    downloadStatus.hidden = true;
    announce = vi.fn<(message: string) => void>();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(URL.createObjectURL).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
  });

  const fire = (key: string, ctrl: boolean) => {
    const event = new KeyboardEvent('keydown', { key, ctrlKey: ctrl, cancelable: true });
    handleDownloadKeydown(event, editor, downloadStatus, DEFAULT_SHORTCUTS, announce, false);
    return event;
  };

  it('Ctrl+S でダウンロードされ、announce が呼ばれ、download-status が表示される', () => {
    fire('s', true);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(announce).toHaveBeenCalledWith('保存しました');
    expect(downloadStatus.hidden).toBe(false);
    expect(downloadStatus.textContent).toBe('保存しました');
  });

  it('2秒後にステータスが非表示になる', () => {
    fire('s', true);
    expect(downloadStatus.hidden).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(downloadStatus.hidden).toBe(true);
    expect(downloadStatus.textContent).toBe('');
  });

  it('Ctrl+S 連打時、タイマーがリセットされ最後の保存から2秒後に非表示になる', () => {
    fire('s', true);
    vi.advanceTimersByTime(1000); // 1秒経過（表示中）
    fire('s', true);              // 連打でタイマーリセット
    vi.advanceTimersByTime(1000); // さらに1秒（連打後1秒 = 合計2秒）
    expect(downloadStatus.hidden).toBe(false); // まだ表示中
    vi.advanceTimersByTime(1000); // 連打後2秒
    expect(downloadStatus.hidden).toBe(true);
  });

  it('Ctrl+S 連打時、announce は保存ごとに呼ばれる', () => {
    fire('s', true);
    fire('s', true);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenCalledWith('保存しました');
  });

  it('Ctrl+S 以外のキーは無視される', () => {
    fire('a', true);  // Ctrl+A
    fire('s', false); // S（Ctrl なし）
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
    expect(downloadStatus.hidden).toBe(true);
  });
});
