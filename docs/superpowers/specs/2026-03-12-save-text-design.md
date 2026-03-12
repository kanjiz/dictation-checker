# テキスト保存機能 設計書

## 背景

本ツールは視覚障害者（全盲・弱視）の職業訓練を目的としている。書き取り練習後にテキストエリアの内容をファイルに保存する手段がなく、練習結果を手元に残せない問題がある。

## 要件

- Ctrl+S でテキストエリアの内容をファイルに保存する（Windows 対応）
- ファイル名は日時ベース（`dictation-YYYYMMDD-HHMMSS.txt`、ローカル時刻）
- 保存先はブラウザのダウンロードフォルダ（ダイアログなし）
- テキストが空でも保存する
- 保存後にスクリーンリーダーへ通知（全盲ユーザー向け）
- 保存後に視覚的なステータス表示（弱視ユーザー向け）、2秒後に非表示

## 設計

### HTML（index.html）

テキストエリアの直後に保存ステータス要素を追加し、フッターのショートカット一覧に Ctrl+S を追記する。

```html
<textarea id="editor" aria-keyshortcuts="Control+Enter Control+ArrowLeft Control+ArrowRight Control+S" ...></textarea>
<p id="save-status" hidden></p>
```

- `aria-keyshortcuts` は現行値（`"Control+Enter Control+ArrowLeft"`）に `Control+ArrowRight`（既存の漏れを修正）と `Control+S` を追加した完成形
- `aria-live` は付与しない（スクリーンリーダー通知は既存の `#status-region` + `announce()` に統一）
- `save-status` は視覚表示専用
- 初期状態は `hidden` で非表示
- テキストは JS 側でセット

フッターのショートカット一覧：

```html
<li><kbd>Ctrl</kbd> + <kbd>S</kbd>: 保存</li>
```

### 新規ファイル（src/save.ts）

保存ロジックを2つの関数に分離する。

#### `generateFilename`（内部ヘルパー）

```typescript
export function generateFilename(date: Date): string
```

`Date` オブジェクトを受け取り、ローカル時刻で `dictation-YYYYMMDD-HHMMSS.txt` 形式の文字列を返す。`Date` を引数にすることでテストが書きやすくなる。

#### `saveText`（公開インターフェース）

```typescript
export function saveText(text: string, filename: string): void
```

Blob（`text/plain; charset=utf-8`）を生成し、オブジェクト URL を作成。`download` 属性付きの `<a>` 要素をプログラムでクリックして即座にダウンロードさせる。クリック後はオブジェクト URL を解放する。`text` が空でも動作する。

#### `handleSaveKeydown`（公開インターフェース）

```typescript
export function handleSaveKeydown(
  e: KeyboardEvent,
  editor: HTMLTextAreaElement,
  saveStatus: HTMLElement,
  announce: (message: string) => void,
): void
```

Ctrl+S を検出したとき：

1. `e.preventDefault()` でブラウザのページ保存を抑止する
2. `generateFilename(new Date())` でファイル名を生成する
3. `saveText(editor.value, filename)` でファイルを保存する
4. `announce('保存しました')` でスクリーンリーダーに通知する
5. `saveStatus` の `hidden` を外し、テキストを「保存しました」にセットする
6. 2秒後に `saveStatus` に `hidden` を付与してテキストをクリアする

Ctrl+S 連打時、`announce()` は保存ごとに呼ばれる。`announce()` 内部には `textContent === message` のガードがあるため、累積タイマーがあっても最後の呼び出しから2秒後に一度だけ `statusRegion` がクリアされる（既存の動作に委ねる）。`saveStatus` の非表示タイマーは `clearTimeout` で前回分をキャンセルしてから新たにセットし、「最後の保存から2秒間」視覚表示が維持されるようにする。`saveStatus` と `#status-region` の非表示タイミングは独立しており、これは意図した設計である。

Ctrl+S 以外のキーは何もしない。

### main.ts

`editor` の `keydown` ハンドラに `handleSaveKeydown` の呼び出しを追加する。

```typescript
editor.addEventListener('keydown', (e: KeyboardEvent) => {
  handleSaveKeydown(e, editor, saveStatus, announce);
  handleKeydown(e, player, DEFAULT_SHORTCUTS, announce);
});
```

`saveStatus` は `document.getElementById('save-status')` で取得する。

### CSS（src/style.css）

保存ステータスのスタイルを追加する。

```css
#save-status {
  color: #006600;
  font-weight: bold;
  margin-top: 0.25rem;
}
```

緑色（白背景比約 5.1:1、WCAG AA 準拠）でポジティブなフィードバックを表現する。色だけでなくテキスト内容でも意味を伝えるため、色のみへの依存を避ける。

### テスト（src/save.test.ts）

`generateFilename`・`saveText`・`handleSaveKeydown` の単体テストを vitest で追加する。

jsdom 環境では `URL.createObjectURL` / `URL.revokeObjectURL` が未実装のため、`beforeAll` でスタブを貼る（`audio.test.ts` と同じパターン）。

| テストケース | 確認内容 |
| --- | --- |
| `generateFilename` | `dictation-YYYYMMDD-HHMMSS.txt` 形式の文字列を返す |
| 通常テキストの保存 | `URL.createObjectURL` が呼ばれ、`<a>` の `click` が呼ばれる |
| 空テキストの保存 | 空でも `saveText` が正常に動作する |
| Ctrl+S で保存される | `saveText` が呼ばれ、`announce` が呼ばれ、`save-status` が表示される |
| 2秒後にステータスが非表示になる | `hidden` が付与される |
| Ctrl+S 連打時 | `announce` が保存ごとに呼ばれ、`saveStatus` の非表示タイマーはリセットされ最後の保存から2秒後に `hidden` が付与される |
| 他のキーは無視 | Ctrl+S 以外で `saveText` が呼ばれない |

## ファイル変更一覧

| ファイル | 変更種別 |
| --- | --- |
| `index.html` | 変更（`save-status` 要素追加、`aria-keyshortcuts` 更新、ショートカット一覧に Ctrl+S 追記） |
| `src/save.ts` | 新規作成 |
| `src/save.test.ts` | 新規作成 |
| `src/main.ts` | 変更（`handleSaveKeydown` 呼び出し追加） |
| `src/style.css` | 変更（保存ステータススタイル追加） |
