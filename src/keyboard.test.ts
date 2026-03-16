import { describe, it, expect } from 'vitest';
import { matches } from './keyboard.ts';
import type { ShortcutKey } from './shortcuts.ts';

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
