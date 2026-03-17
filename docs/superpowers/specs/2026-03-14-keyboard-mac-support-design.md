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
- **`matches()` はオプション引数 `mac` でテスト可能にする。** `isMac` がモジュール定数のため、テストから Mac/非Mac を制御するための脱出口として第3引数を用意する

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
 *
 * @param mac - 省略時は isMac を使用。テストから明示的に渡すことで
 *              Mac/非Mac のパスを切り替えられる。
 */
export function matches(
  event: KeyboardEvent,
  shortcut: ShortcutKey,
  mac = isMac,
): boolean {
  const modPressed = mac ? event.metaKey : event.ctrlKey;
  return modPressed === shortcut.modifier && event.key === shortcut.key;
}

/**
 * `ShortcutKey.key`（内部名）をユーザー向け表示文字列に変換するマップ。
 * 登録外のキーはそのまま表示する。
 */
const keyDisplayMap: Record<string, string> = {
  ArrowLeft:  '←',
  ArrowRight: '→',
  Enter:      'Enter',
};

/**
 * フッターの <kbd> 表示と textarea の placeholder を
 * 現在の OS とショートカット設定に合わせて更新する。
 * 設定変更時（import後など）に再呼び出しすることを想定している。
 *
 * HTML 側の規約:
 *   - <kbd data-mod>  → '⌘' または 'Ctrl' に書き換える
 *   - <kbd data-key="playPause"> など → shortcuts の対応キー表示名に書き換える
 *   - #editor の aria-keyshortcuts と placeholder も更新する
 */
export function updateShortcutDisplay(shortcuts: ShortcutConfig): void {
  const modLabel  = isMac ? '⌘' : 'Ctrl';
  const modPrefix = isMac ? 'Meta' : 'Control';

  // 修飾キー表示を更新
  document.querySelectorAll<HTMLElement>('kbd[data-mod]').forEach((el) => {
    el.textContent = modLabel;
  });

  // 各ショートカットキー名を更新（ShortcutConfig を直接参照）
  const config = shortcuts as Record<string, ShortcutKey>;
  document.querySelectorAll<HTMLElement>('kbd[data-key]').forEach((el) => {
    const name = el.dataset['key'] as string;
    if (name in config) {
      el.textContent = keyDisplayMap[config[name].key] ?? config[name].key;
    }
  });

  // #editor の aria-keyshortcuts と placeholder を更新
  const editor = document.getElementById('editor');
  if (editor) {
    const keys = Object.values(shortcuts)
      .map((s) => `${modPrefix}+${s.key}`)
      .join(' ');
    editor.setAttribute('aria-keyshortcuts', keys);
    editor.setAttribute(
      'placeholder',
      `${modLabel} + Enter で再生・一時停止`,
    );
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
`<script type="module">` は defer 相当のため、DOM 解析完了後に実行されることが保証されている。

```ts
import { updateShortcutDisplay } from './keyboard.ts';
// ...
updateShortcutDisplay(DEFAULT_SHORTCUTS);
```

---

### `index.html` — 変更点

`<kbd>` に `data-mod` / `data-key` 属性を追加。
JS 実行前の初期表示として人間が読める文字列（`Ctrl`、`←`、`→` 等）を入れておく。
`placeholder` は `updateShortcutDisplay()` が書き換えるため、HTML 側の初期値はそのままでよい。

```html
<!-- 変更前 -->
<li><kbd>Ctrl</kbd> + <kbd>Enter</kbd>: 再生 / 一時停止</li>
<li><kbd>Ctrl</kbd> + <kbd>←</kbd>: 10秒戻る</li>
<li><kbd>Ctrl</kbd> + <kbd>→</kbd>: 10秒進む</li>
<li><kbd>Ctrl</kbd> + <kbd>S</kbd>: 保存</li>

<!-- 変更後 -->
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="playPause">Enter</kbd>: 再生 / 一時停止</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekBack">←</kbd>: 10秒戻る</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekForward">→</kbd>: 10秒進む</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="download">S</kbd>: 保存</li>
```

---

## テスト方針

### 既存テスト（`player.test.ts` / `download.test.ts`）

jsdom の `navigator.userAgent` は Mac ではないため `isMac = false` になる。
既存の `fire(key, ctrl)` ヘルパーは `ctrlKey` を渡しており、非 Mac パスとして引き続き有効。
**変更不要**（`modifier` への改名で `DEFAULT_SHORTCUTS` の参照は変わらない）。

### 新規テスト: `src/keyboard.test.ts`

`matches()` の第3引数（`mac`）を使い、Mac/非Mac の両パスを明示的にテストする。

```ts
// 非Mac: ctrlKey が必要
matches(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }), shortcut, false)
// → true

// Mac: metaKey が必要
matches(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }), shortcut, true)
// → true
```

`updateShortcutDisplay()` は jsdom の DOM を使ってテストする。
`isMac = false` 環境（jsdom）で非 Mac パスを確認するか、手動確認で許容する。

---

## 変更対象ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `src/shortcuts.ts` | 改修（`ctrl` → `modifier`） |
| `src/keyboard.ts` | 新規作成 |
| `src/keyboard.test.ts` | 新規作成 |
| `src/player.ts` | 改修（matches を import） |
| `src/download.ts` | 改修（matches を import） |
| `src/main.ts` | 改修（updateShortcutDisplay 呼び出し追加） |
| `index.html` | 改修（data 属性追加・初期表示を人間向け文字に修正） |
