# keyboard.ts 導入と Mac ショートカット対応 — 設計書

**日付:** 2026-03-14
**対象バージョン:** v0.2.x → v0.3.0

---

## 概要

`player.ts` と `download.ts` に重複している `matches()` ロジックを `keyboard.ts` に集約し、Mac では `Cmd`（metaKey）、Windows/Linux では `Ctrl`（ctrlKey）を使うように対応する。あわせて `index.html` の `<kbd>` 表示を OS に応じて動的に切り替える。

---

## 背景・動機

- `matches()` が `player.ts` にローカル関数、`download.ts` にインラインで重複している
- どちらも `event.ctrlKey` のみ参照しており、Mac での `Cmd` キーを認識しない
- `index.html` の `<kbd>Ctrl</kbd>` 表示が Mac ユーザーに対して不正確

---

## 設計方針

- **Mac: `⌘`（metaKey）のみ。** `Ctrl` には反応しない（ブラウザのデフォルト動作を尊重）
- **`ShortcutKey.ctrl` → `modifier` に改名。** OS を問わず「修飾キーが必要かどうか」を表すフィールドとして意味を明確化
- **`keyboard.ts` を新設し3つのエクスポートを持つ:** `isMac`, `matches()`, `updateShortcutDisplay()`
- **`updateShortcutDisplay()` は再呼び出し可能な関数として設計する。** 将来の設定 import 後にも呼べるようにするため、`ShortcutConfig` を引数に取る

---

## ファイル構成と変更内容

### `src/shortcuts.ts` — 変更点

`ShortcutKey.ctrl` を `modifier` に改名。型・値の構造は変わらない。

```ts
export type ShortcutKey = {
  readonly key: string;
  readonly modifier: boolean;   // 旧: ctrl
};

export type ShortcutConfig = {
  readonly playPause:   ShortcutKey;
  readonly seekBack:    ShortcutKey;
  readonly seekForward: ShortcutKey;
  readonly download:    ShortcutKey;
};

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  playPause:   { key: 'Enter',      modifier: true },
  seekBack:    { key: 'ArrowLeft',  modifier: true },
  seekForward: { key: 'ArrowRight', modifier: true },
  download:    { key: 's',          modifier: true },
} as const;
```

---

### `src/keyboard.ts` — 新規作成

```ts
import type { ShortcutKey, ShortcutConfig } from './shortcuts.ts';

/** Mac かどうかを userAgent で判定 */
export const isMac = /Mac/.test(navigator.userAgent);

/**
 * キーボードイベントがショートカット定義にマッチするか判定する。
 * Mac では metaKey（Cmd）、それ以外では ctrlKey を使用する。
 */
export function matches(event: KeyboardEvent, shortcut: ShortcutKey): boolean {
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  return modPressed === shortcut.modifier && event.key === shortcut.key;
}

/**
 * フッターの <kbd> 表示を現在の OS とショートカット設定に合わせて更新する。
 * 設定変更時（import後など）に再呼び出しすることを想定している。
 *
 * HTML 側の規約:
 *   - <kbd data-mod>  → Ctrl または ⌘ に書き換える
 *   - <kbd data-key="playPause"> など → shortcuts[key].key の値に書き換える
 *   - aria-keyshortcuts 属性も更新する
 */
export function updateShortcutDisplay(shortcuts: ShortcutConfig): void {
  const modLabel = isMac ? '⌘' : 'Ctrl';
  const modPrefix = isMac ? 'Meta' : 'Control';

  // 修飾キー表示を更新
  document.querySelectorAll<HTMLElement>('kbd[data-mod]').forEach((el) => {
    el.textContent = modLabel;
  });

  // 各ショートカットキー名を更新
  const keyMap: Record<string, ShortcutKey> = {
    playPause:   shortcuts.playPause,
    seekBack:    shortcuts.seekBack,
    seekForward: shortcuts.seekForward,
    download:    shortcuts.download,
  };
  document.querySelectorAll<HTMLElement>('kbd[data-key]').forEach((el) => {
    const name = el.dataset['key'] as string;
    if (name in keyMap) {
      el.textContent = keyMap[name].key;
    }
  });

  // aria-keyshortcuts を更新
  const editor = document.getElementById('editor');
  if (editor) {
    const keys = Object.values(shortcuts)
      .map((s) => `${modPrefix}+${s.key}`)
      .join(' ');
    editor.setAttribute('aria-keyshortcuts', keys);
  }
}
```

---

### `src/player.ts` — 変更点

- ローカルの `matches()` 関数を削除
- `keyboard.ts` から `matches` を import

```ts
// 削除: function matches(...)
import { matches } from './keyboard.ts';
```

---

### `src/download.ts` — 変更点

- インラインの `ctrlKey` 判定を削除
- `keyboard.ts` から `matches` を import して使用

```ts
import { matches } from './keyboard.ts';
// ...
if (!matches(event, shortcuts.download)) return;
```

---

### `src/main.ts` — 変更点

起動時に `updateShortcutDisplay(DEFAULT_SHORTCUTS)` を呼ぶ。

```ts
import { updateShortcutDisplay } from './keyboard.ts';
// ...
updateShortcutDisplay(DEFAULT_SHORTCUTS);
```

---

### `index.html` — 変更点

`<kbd>` に `data-mod` / `data-key` 属性を追加。初期表示として `Ctrl` を残しておくが、JS が上書きする。

```html
<!-- 変更前 -->
<li><kbd>Ctrl</kbd> + <kbd>Enter</kbd>: 再生 / 一時停止</li>
<li><kbd>Ctrl</kbd> + <kbd>←</kbd>: 10秒戻る</li>
<li><kbd>Ctrl</kbd> + <kbd>→</kbd>: 10秒進む</li>
<li><kbd>Ctrl</kbd> + <kbd>S</kbd>: 保存</li>

<!-- 変更後 -->
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="playPause">Enter</kbd>: 再生 / 一時停止</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekBack">ArrowLeft</kbd>: 10秒戻る</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekForward">ArrowRight</kbd>: 10秒進む</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="download">s</kbd>: 保存</li>
```

---

## テスト方針

- `matches()` は純粋関数のため単体テスト可能（`KeyboardEvent` をモックして渡す）
- `updateShortcutDisplay()` は DOM に依存するため、`player.test.ts` / `download.test.ts` 同様の構成でテストするか、手動確認で許容する
- 既存の `player.test.ts` / `download.test.ts` で `matches()` のテストがあれば `keyboard.ts` に移動する

---

## 変更対象ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `src/shortcuts.ts` | 改修（`ctrl` → `modifier`） |
| `src/keyboard.ts` | 新規作成 |
| `src/player.ts` | 改修（matches を import） |
| `src/download.ts` | 改修（matches を import） |
| `src/main.ts` | 改修（updateShortcutDisplay 呼び出し追加） |
| `index.html` | 改修（data 属性追加） |
