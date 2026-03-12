import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { handleAudioFile } from './audio.ts';

// URL.createObjectURL / revokeObjectURL は jsdom 未実装のためモック
let urlCounter = 0;
beforeAll(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockImplementation(() => `blob:mock-url-${++urlCounter}`),
    revokeObjectURL: vi.fn(),
  });
});

describe('handleAudioFile', () => {
  let player: HTMLAudioElement;
  let audioError: HTMLParagraphElement;
  let editor: HTMLTextAreaElement;
  let announce: ReturnType<typeof vi.fn<(message: string) => void>>;
  let file: File;
  let audioInput: HTMLInputElement;

  beforeEach(() => {
    player = document.createElement('audio');
    vi.spyOn(player, 'load').mockImplementation(() => {});

    audioError = document.createElement('p');
    audioError.hidden = true;

    editor = document.createElement('textarea');
    vi.spyOn(editor, 'focus');

    announce = vi.fn();
    file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    audioInput = document.createElement('input');
    audioInput.type = 'file';
    vi.spyOn(audioInput, 'focus');
  });

  describe('正常ファイル選択時', () => {
    beforeEach(() => {
      vi.spyOn(player, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'loadedmetadata') {
          (handler as EventListener)(new Event(event));
        }
      });
    });

    it('editor.focus() が呼ばれる', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(editor.focus).toHaveBeenCalledOnce();
    });

    it('announce が正しいメッセージで呼ばれる', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(announce).toHaveBeenCalledWith('音声を読み込みました。入力エリアに移動します。');
    });

    it('エラー要素が hidden のまま', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioError.hidden).toBe(true);
    });

    it('audioInput.focus() は呼ばれない', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioInput.focus).not.toHaveBeenCalled();
    });
  });

  describe('無効ファイル選択時', () => {
    beforeEach(() => {
      vi.spyOn(player, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'error') {
          (handler as EventListener)(new Event(event));
        }
      });
    });

    it('エラー要素にメッセージがセットされ hidden が外れる', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioError.hidden).toBe(false);
      expect(audioError.textContent).toBe('再生できないファイルです');
    });

    it('editor.focus() は呼ばれない', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(editor.focus).not.toHaveBeenCalled();
    });

    it('announce は呼ばれない', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(announce).not.toHaveBeenCalled();
    });

    it('URL.revokeObjectURL が呼ばれる', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('audioInput.focus() が呼ばれる', async () => {
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioInput.focus).toHaveBeenCalledOnce();
    });
  });

  describe('2回目のファイル選択時', () => {
    it('呼び出し開始時点で前回のエラーがリセットされる', async () => {
      // addEventListener の呼び出し順：
      //   1: loadedmetadata (1回目), 2: error (1回目) → エラーを発火して1回目失敗
      //   3: loadedmetadata (2回目) → 成功を発火, 4: error (2回目)
      let callIndex = 0;
      vi.spyOn(player, 'addEventListener').mockImplementation((event, handler) => {
        callIndex++;
        if (callIndex === 2 && event === 'error') {
          (handler as EventListener)(new Event(event));
        } else if (callIndex === 3 && event === 'loadedmetadata') {
          (handler as EventListener)(new Event(event));
        }
      });

      // 1回目: エラー状態にする
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioError.hidden).toBe(false);

      // 2回目: エラーがリセットされ、成功する
      await handleAudioFile(file, player, audioError, editor, announce, audioInput);
      expect(audioError.hidden).toBe(true);
      expect(audioError.textContent).toBe('');
    });
  });

  describe('レースコンディション', () => {
    it('2回目の選択後に1回目のPromiseが解決しても editor.focus は1回しか呼ばれない', async () => {
      const loadedHandlers: Array<() => void> = [];

      vi.spyOn(player, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'loadedmetadata') {
          // ハンドラを保存しておき、後で手動発火する
          loadedHandlers.push(() => (handler as EventListener)(new Event(event)));
        }
      });

      const file2 = new File(['audio'], 'test2.mp3', { type: 'audio/mpeg' });

      // 1回目の呼び出し（loadedmetadata は発火しない → Promise 保留）
      const first = handleAudioFile(file, player, audioError, editor, announce, audioInput);

      // 2回目の呼び出し（currentBlobUrl が上書きされる）
      const second = handleAudioFile(file2, player, audioError, editor, announce, audioInput);

      // 2回目の loadedmetadata を発火して完了させる
      loadedHandlers[1]?.();
      await second;

      // 1回目の loadedmetadata を遅れて発火（currentBlobUrl 不一致 → 早期リターンのはず）
      loadedHandlers[0]?.();
      await first;

      // editor.focus は2回目のみ（1回だけ）
      expect(editor.focus).toHaveBeenCalledOnce();
    });
  });
});
