// src/settings-modal.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isModalOpen, initSettingsModal } from './settings-modal.ts';
import { saveSettings, loadSettings } from './settings-storage.ts';
import { DEFAULT_SETTINGS } from './settings.ts';

// モーダル HTML のテンプレート
const MODAL_HTML = `
  <div id="settings-modal" hidden>
    <section>
      <ul>
        <li>
          <button data-capture="playPause">Enter</button>
          <input type="checkbox" data-modifier="playPause" checked>
          <span data-capture-error="playPause" hidden></span>
        </li>
        <li>
          <button data-capture="seekBack">←</button>
          <input type="checkbox" data-modifier="seekBack" checked>
          <span data-capture-error="seekBack" hidden></span>
        </li>
        <li>
          <button data-capture="seekForward">→</button>
          <input type="checkbox" data-modifier="seekForward" checked>
          <span data-capture-error="seekForward" hidden></span>
        </li>
        <li>
          <button data-capture="download">s</button>
          <input type="checkbox" data-modifier="download" checked>
          <span data-capture-error="download" hidden></span>
        </li>
      </ul>
    </section>
    <section>
      <input type="number" id="seekBackSeconds" min="1" max="60">
      <input type="number" id="seekForwardSeconds" min="1" max="60">
    </section>
    <div>
      <button id="saveSettings">保存</button>
      <button id="exportSettings">書き出し</button>
      <input type="file" id="importSettingsFile" accept=".json">
      <button id="resetSettings">リセット</button>
      <p id="settings-error" hidden></p>
    </div>
  </div>
`;

function pressEsc(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

let onSave: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = MODAL_HTML;
  localStorage.clear();
  saveSettings(DEFAULT_SETTINGS);
  onSave = vi.fn();
  initSettingsModal(onSave);
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

// --- Esc × 3 検出 ---

describe('Esc × 3 でモーダルが開く', () => {
  it('1500ms 以内に 3 回押すとモーダルが開く', () => {
    pressEsc(); pressEsc(); pressEsc();
    expect(isModalOpen()).toBe(true);
    expect(document.getElementById('settings-modal')?.hasAttribute('hidden')).toBe(false);
  });

  it('2 回だけでは開かない', () => {
    pressEsc(); pressEsc();
    expect(isModalOpen()).toBe(false);
  });

  it('タイムアウト後のカウントはリセットされ 3 回に達しない', async () => {
    vi.useFakeTimers();
    pressEsc();
    vi.advanceTimersByTime(1600); // 1500ms 超過
    pressEsc(); pressEsc(); // タイムアウト後 2 回 = 合計 1+2=3 に見えるが 1,2 にリセット
    // タイムアウト後最初の 1 回が「1 から開始」なので 3 回目は次の pressEsc が必要
    expect(isModalOpen()).toBe(false);
    vi.useRealTimers();
  });

  it('タイムアウト後にさらに 2 回押すと開く（タイムアウト後 1 からカウント開始）', async () => {
    vi.useFakeTimers();
    pressEsc();
    vi.advanceTimersByTime(1600);
    pressEsc(); // escCount = 1（タイムアウトでリセット）
    vi.advanceTimersByTime(100);
    pressEsc(); // escCount = 2
    vi.advanceTimersByTime(100);
    pressEsc(); // escCount = 3 → 開く
    expect(isModalOpen()).toBe(true);
    vi.useRealTimers();
  });
});

// --- モーダルを Esc で閉じる ---

describe('モーダルが開いているとき Esc で閉じる', () => {
  beforeEach(() => {
    pressEsc(); pressEsc(); pressEsc(); // 開く
  });

  it('Esc 1 回でモーダルが閉じる', () => {
    pressEsc();
    expect(isModalOpen()).toBe(false);
    expect(document.getElementById('settings-modal')?.hasAttribute('hidden')).toBe(true);
  });

  it('閉じた後 escCount がリセットされ 3 回押すと再び開く', () => {
    pressEsc(); // 閉じる
    pressEsc(); pressEsc(); pressEsc(); // 再オープン
    expect(isModalOpen()).toBe(true);
  });

  it('Esc でキャンセルしても onSave は呼ばれない', () => {
    pressEsc(); // 閉じる（キャンセル）
    expect(onSave).not.toHaveBeenCalled();
  });
});

// --- キャプチャ UI ---

describe('キャプチャ UI', () => {
  beforeEach(() => {
    pressEsc(); pressEsc(); pressEsc(); // モーダルを開く
  });

  it('キャプチャボタンをクリックするとラベルが「キャプチャ中...」になる', () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-capture="seekBack"]')!;
    btn.click();
    expect(btn.textContent).toBe('キャプチャ中...');
  });

  it('キャプチャ中に Esc → キャプチャキャンセル・モーダルは閉じない', () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-capture="seekBack"]')!;
    btn.click();
    pressEsc(); // キャプチャキャンセル（Esc は stopPropagation されるのでモーダルは閉じない）
    expect(isModalOpen()).toBe(true);
    expect(btn.textContent).not.toBe('キャプチャ中...');
  });

  it('キャプチャ中に修飾キー単体（Meta）→ 無視されキャプチャ継続', () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-capture="seekBack"]')!;
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', bubbles: true, cancelable: true }));
    expect(btn.textContent).toBe('キャプチャ中...'); // まだキャプチャ中
  });

  it('キャプチャ中に通常キー → ドラフトに反映', () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-capture="seekBack"]')!;
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    expect(btn.textContent).toBe('a');
  });

  it('重複するキーをキャプチャ → エラー表示・値は変わらない', () => {
    // seekBack に playPause と同じ Enter + modifier を設定しようとする
    const btn = document.querySelector<HTMLButtonElement>('[data-capture="seekBack"]')!;
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const errEl = document.querySelector('[data-capture-error="seekBack"]')!;
    expect(errEl.hasAttribute('hidden')).toBe(false);
    expect(btn.textContent).toBe('←'); // 元の値に戻る
  });
});

// --- 保存フロー ---

describe('保存フロー', () => {
  beforeEach(() => {
    pressEsc(); pressEsc(); pressEsc(); // モーダルを開く
  });

  it('「保存」クリック → saveSettings が呼ばれ onSave が発火しモーダルが閉じる', () => {
    document.getElementById('saveSettings')!.click();
    expect(onSave).toHaveBeenCalledOnce();
    expect(isModalOpen()).toBe(false);
  });

  it('「リセット」クリック → DEFAULT_SETTINGS が localStorage に保存され onSave が発火、モーダルは開いたまま', () => {
    // カスタム設定を保存しておく
    saveSettings({ ...DEFAULT_SETTINGS, seek: { backSeconds: 5, forwardSeconds: 5 } });
    document.getElementById('resetSettings')!.click();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(onSave).toHaveBeenCalledOnce();
    expect(isModalOpen()).toBe(true); // モーダルは閉じない
  });
});
