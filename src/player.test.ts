import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePlayerKeydown } from './player.ts';
import { DEFAULT_SETTINGS } from './settings.ts';

/**
 * currentTime を制御可能にするためのヘルパー。
 * ブラウザでは src なしの audio 要素は currentTime を
 * 意図通りに反映しないため、プロパティを差し替える。
 */
function mockCurrentTime(player: HTMLAudioElement, initial = 0): { get: () => number } {
  let value = initial;
  Object.defineProperty(player, 'currentTime', {
    get: () => value,
    set: (v: number) => { value = v; },
    configurable: true,
  });
  return { get: () => value };
}

describe('handlePlayerKeydown', () => {
  let player: HTMLAudioElement;
  let announce: ReturnType<typeof vi.fn<(message: string) => void>>;

  beforeEach(() => {
    player = document.createElement('audio');
    vi.spyOn(player, 'play').mockResolvedValue(undefined);
    vi.spyOn(player, 'pause').mockImplementation(() => { /* noop */ });
    announce = vi.fn<(message: string) => void>();
  });

  const fire = (key: string, ctrl: boolean) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: ctrl,
      bubbles: true,
      cancelable: true,
    });
    // mac = false を渡して OS によらず ctrlKey パスで判定する
    handlePlayerKeydown(event, player, DEFAULT_SETTINGS, announce, false);
    return event;
  };

  describe('Ctrl+Enter — 再生/停止', () => {
    it('一時停止中のとき play() を呼ぶ', () => {
      // paused は src なしのデフォルトで true
      fire('Enter', true);
      expect(player.play).toHaveBeenCalledOnce();
      expect(announce).toHaveBeenCalledWith('再生');
    });

    it('再生中のとき pause() を呼ぶ', () => {
      Object.defineProperty(player, 'paused', { value: false, configurable: true });
      fire('Enter', true);
      expect(player.pause).toHaveBeenCalledOnce();
      expect(announce).toHaveBeenCalledWith('停止');
    });
  });

  describe('Ctrl+ArrowLeft — 10秒戻る', () => {
    it('currentTime を 10 秒戻す', () => {
      const ct = mockCurrentTime(player, 30);
      fire('ArrowLeft', true);
      expect(ct.get()).toBe(20);
      expect(announce).toHaveBeenCalledWith('10秒戻る');
    });

    it('currentTime が 5 秒のとき 0 にクランプする', () => {
      const ct = mockCurrentTime(player, 5);
      fire('ArrowLeft', true);
      expect(ct.get()).toBe(0);
      expect(announce).toHaveBeenCalledWith('10秒戻る');
    });
  });

  describe('Ctrl+ArrowRight — 10秒進む', () => {
    beforeEach(() => {
      Object.defineProperty(player, 'duration', { value: 50, configurable: true });
    });

    it('currentTime を 10 秒進める', () => {
      const ct = mockCurrentTime(player, 30);
      fire('ArrowRight', true);
      expect(ct.get()).toBe(40);
      expect(announce).toHaveBeenCalledWith('10秒進む');
    });

    it('currentTime が duration に近いとき duration にクランプする', () => {
      const ct = mockCurrentTime(player, 45);
      fire('ArrowRight', true);
      expect(ct.get()).toBe(50);
      expect(announce).toHaveBeenCalledWith('10秒進む');
    });
  });

  describe('無視するケース', () => {
    it('Ctrl なしの Enter は何もしない', () => {
      fire('Enter', false);
      expect(player.play).not.toHaveBeenCalled();
      expect(player.pause).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    });

    it('Ctrl+A は何もしない', () => {
      fire('A', true);
      expect(player.play).not.toHaveBeenCalled();
      expect(player.pause).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe('カスタム seek 秒数', () => {
    it('backSeconds: 5 のとき 5秒戻る', () => {
      const settings = { ...DEFAULT_SETTINGS, seek: { backSeconds: 5, forwardSeconds: 10 } };
      const ct = mockCurrentTime(player, 30);
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true, cancelable: true });
      handlePlayerKeydown(event, player, settings, announce, false);
      expect(ct.get()).toBe(25);
      expect(announce).toHaveBeenCalledWith('5秒戻る');
    });

    it('forwardSeconds: 30 のとき 30秒進む', () => {
      const settings = { ...DEFAULT_SETTINGS, seek: { backSeconds: 10, forwardSeconds: 30 } };
      Object.defineProperty(player, 'duration', { value: 120, configurable: true });
      const ct = mockCurrentTime(player, 50);
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, cancelable: true });
      handlePlayerKeydown(event, player, settings, announce, false);
      expect(ct.get()).toBe(80);
      expect(announce).toHaveBeenCalledWith('30秒進む');
    });
  });
});
