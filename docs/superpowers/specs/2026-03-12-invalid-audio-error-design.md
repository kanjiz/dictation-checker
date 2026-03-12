# 無効音声ファイルエラー対応 設計書

## 背景

本ツールは視覚障害者（全盲・弱視）の職業訓練を目的としている。音声ファイルを選択した際、ブラウザが再生できない無効なファイルを選択してもエラーが表示されず、ユーザーが状況を把握できない問題がある。

## 要件

- ブラウザが解析できない音声ファイルを選択した場合、エラーをユーザーに伝える
- スクリーンリーダーへの即時通知（全盲ユーザー向け）
- 視覚的なエラーメッセージ表示（弱視ユーザー向け）
- エラー時はファイル入力にフォーカスを留める（再選択を促す）
- 成功時はテキストエリアへフォーカスを移動する（現在の動作を維持）

## 設計

### HTML（index.html）

ファイル入力の `aria-describedby` に `audio-error` を追加し、エラーメッセージ要素を隣接配置する。

```html
<input type="file" id="audioFile" accept="audio/*" aria-describedby="audio-help audio-error">
<p id="audio-help" class="visually-hidden">ファイルを選択すると、自動的にプレイヤーに読み込まれます。</p>
<p id="audio-error" role="alert" hidden></p>
```

- `role="alert"` により、`hidden` が外れた時点でスクリーンリーダーが即座に読み上げる
- 初期状態は `hidden` で非表示
- テキストは JS 側でセット（空要素として定義）

### 新規ファイル（src/audio.ts）

ファイル選択時のロジックを `handleAudioFile` 関数として切り出す。

```typescript
handleAudioFile(
  file: File,
  player: HTMLAudioElement,
  audioError: HTMLElement,
  editor: HTMLTextAreaElement,
  announce: (message: string) => void,
): void
```

処理フロー：

0. エラー要素を非表示・クリアする（連続選択時に前回のエラーをリセット）
1. 既存の BlobURL があれば解放する
2. 新しい BlobURL を生成して `player.src` にセット
3. `player` に `loadedmetadata` と `error` のイベントリスナーを `{ once: true }` で登録
4. **成功（loadedmetadata）**：`announce("音声を読み込みました。入力エリアに移動します。")` → `editor.focus()`
5. **失敗（error）**：BlobURL を解放 → `player.src = ''` → エラー要素にメッセージをセットして `hidden` を外す（`announce` は呼ばない）

エラーメッセージ文字列：`"再生できないファイルです"`

### main.ts

`audioInput` の `change` イベントハンドラは `file` の null チェックのみ行い、`handleAudioFile` を呼び出す。フォーカス移動・アナウンスの処理はすべて `audio.ts` に移譲する。

### CSS（src/style.css）

エラーメッセージのスタイルを追加する。

```css
#audio-error {
  color: #c00;
  font-weight: bold;
  margin-top: 0.25rem;
}
```

高コントラストな赤色で弱視ユーザーに視認しやすくする。色だけでなくテキスト内容でも意味を伝えるため、色のみへの依存を避ける。

### テスト（src/audio.test.ts）

`handleAudioFile` の単体テストを vitest で追加する。

| テストケース | 確認内容 |
| --- | --- |
| 正常ファイル選択時 | `editor.focus()` が呼ばれる、エラー要素が hidden のまま、`announce` が呼ばれる |
| 無効ファイル選択時 | エラー要素にメッセージがセットされ `hidden` が外れる、`editor.focus()` は呼ばれない、`announce` は呼ばれない |
| 2回目のファイル選択時 | 呼び出し開始時点でエラー要素が hidden に戻りテキストがクリアされる |
| BlobURL の解放 | エラー時に `URL.revokeObjectURL` が呼ばれる |

## ファイル変更一覧

| ファイル | 変更種別 |
| --- | --- |
| `index.html` | 変更（エラー要素追加、aria-describedby更新） |
| `src/audio.ts` | 新規作成 |
| `src/audio.test.ts` | 新規作成 |
| `src/main.ts` | 変更（handleAudioFile 呼び出しに置き換え） |
| `src/style.css` | 変更（エラースタイル追加） |
