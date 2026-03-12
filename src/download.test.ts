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
