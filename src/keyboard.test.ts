import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { matches, updateShortcutDisplay } from './keyboard.ts';
import { type ShortcutKey, DEFAULT_SETTINGS } from './settings.ts';

/** テスト用 KeyboardEvent を生成するヘルパー */
function makeKeyEvent(
  key: string,
  options: { ctrlKey?: boolean; metaKey?: boolean } = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ...options });
}

describe('matches()', () => {
  const shortcut: ShortcutKey = { key: 'Enter', modifier: true };

  describe('非 Mac（mac = false）', () => {
    it('ctrlKey + Enter でマッチする', () => {
      expect(matches(makeKeyEvent('Enter', { ctrlKey: true }), shortcut, false)).toBe(true);
    });

    it('metaKey + Enter はマッチしない', () => {
      expect(matches(makeKeyEvent('Enter', { metaKey: true }), shortcut, false)).toBe(false);
    });

    it('キーが違えばマッチしない', () => {
      expect(matches(makeKeyEvent('a', { ctrlKey: true }), shortcut, false)).toBe(false);
    });

    it('修飾キーなしはマッチしない', () => {
      expect(matches(makeKeyEvent('Enter'), shortcut, false)).toBe(false);
    });
  });

  describe('Mac（mac = true）', () => {
    it('metaKey + Enter でマッチする', () => {
      expect(matches(makeKeyEvent('Enter', { metaKey: true }), shortcut, true)).toBe(true);
    });

    it('ctrlKey + Enter はマッチしない', () => {
      expect(matches(makeKeyEvent('Enter', { ctrlKey: true }), shortcut, true)).toBe(false);
    });

    it('キーが違えばマッチしない', () => {
      expect(matches(makeKeyEvent('a', { metaKey: true }), shortcut, true)).toBe(false);
    });

    it('修飾キーなしはマッチしない', () => {
      expect(matches(makeKeyEvent('Enter'), shortcut, true)).toBe(false);
    });
  });

  describe('modifier: false のショートカット', () => {
    const noModShortcut: ShortcutKey = { key: 'Enter', modifier: false };

    it('修飾キーなしでマッチする', () => {
      expect(matches(makeKeyEvent('Enter'), noModShortcut, false)).toBe(true);
    });

    it('ctrlKey があるとマッチしない', () => {
      expect(matches(makeKeyEvent('Enter', { ctrlKey: true }), noModShortcut, false)).toBe(false);
    });
  });
});

describe('updateShortcutDisplay()', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('<kbd data-mod> の textContent が OS に応じた修飾キー表示に更新される', () => {
    container.innerHTML = '<kbd data-mod>Ctrl</kbd>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const kbd = container.querySelector<HTMLElement>('kbd[data-mod]');
    // 非 Mac（mac = false）なので Ctrl になる
    expect(kbd?.textContent).toBe('Ctrl');
  });

  it('<kbd data-key="playPause"> の textContent がキー表示に更新される', () => {
    container.innerHTML = '<kbd data-key="playPause">Enter</kbd>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const kbd = container.querySelector<HTMLElement>('kbd[data-key="playPause"]');
    expect(kbd?.textContent).toBe('Enter');
  });

  it('<kbd data-key="seekBack"> の textContent が ← に更新される', () => {
    container.innerHTML = '<kbd data-key="seekBack">←</kbd>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const kbd = container.querySelector<HTMLElement>('kbd[data-key="seekBack"]');
    expect(kbd?.textContent).toBe('←');
  });

  it('<kbd data-key="seekForward"> の textContent が → に更新される', () => {
    container.innerHTML = '<kbd data-key="seekForward">→</kbd>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const kbd = container.querySelector<HTMLElement>('kbd[data-key="seekForward"]');
    expect(kbd?.textContent).toBe('→');
  });

  it('editor 要素の aria-keyshortcuts が更新される', () => {
    container.innerHTML = '<div id="editor"></div>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const editor = document.getElementById('editor');
    // 非 Mac（mac = false）なので Control+... になる
    expect(editor?.getAttribute('aria-keyshortcuts')).toContain('Control+Enter');
  });

  it('editor 要素の placeholder が更新される', () => {
    container.innerHTML = '<div id="editor"></div>';
    updateShortcutDisplay(DEFAULT_SETTINGS, false);
    const editor = document.getElementById('editor');
    expect(editor?.getAttribute('placeholder')).toBe('Ctrl + Enter で再生・一時停止');
  });
});

describe('updateShortcutDisplay() — data-seek span', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('<span data-seek="back"> の textContent が backSeconds に更新される', () => {
    container.innerHTML = '<span data-seek="back">10</span>';
    const settings = { ...DEFAULT_SETTINGS, seek: { backSeconds: 5, forwardSeconds: 10 } };
    updateShortcutDisplay(settings, false);
    expect(container.querySelector('[data-seek="back"]')?.textContent).toBe('5');
  });

  it('<span data-seek="forward"> の textContent が forwardSeconds に更新される', () => {
    container.innerHTML = '<span data-seek="forward">10</span>';
    const settings = { ...DEFAULT_SETTINGS, seek: { backSeconds: 10, forwardSeconds: 30 } };
    updateShortcutDisplay(settings, false);
    expect(container.querySelector('[data-seek="forward"]')?.textContent).toBe('30');
  });
});
