# 設定外部化 — 設計書

**日付:** 2026-03-17
**対象バージョン:** v0.3.0 → v0.4.0

---

## 概要

ショートカットキーと seek 秒数をユーザーが変更できるようにする。
設定は localStorage に保存し、settings.json による別マシンへの持ち運びをサポートする。
設定変更は Esc × 3 で起動するモーダルから行う。

---

## 背景・動機

- ショートカットキーが `shortcuts.ts` にハードコードされており変更できない
- seek 秒数（10秒）が `player.ts` にハードコードされており変更できない
- 複数マシン間で設定を共有する手段がない

---

## 設計方針

| 論点 | 決定 |
| --- | --- |
| 保存先 | localStorage（キー: `"settings"`） |
| ファイル名 | `shortcuts.ts` → `settings.ts`（改名・拡張） |
| スキーマ | `version` フィールドあり（現行バージョン: 1） |
| version 未知 | `version !== 1` は invalid として onError を呼び出す |
| import バリデーション | エラー表示して無視（localStorage は変更しない） |
| モーダル内コンテンツ | ショートカット編集 UI・seek 秒数編集・export・import・reset |
| seek 秒数 | 前後独立（`backSeconds` / `forwardSeconds`） |
| モーダル起動 | Esc × 3（ラスト押下から 1500ms 以内のローリングウィンドウ） |
| モーダルを閉じる | Esc × 1（キャプチャモード中は Esc でキャプチャのみキャンセル、モーダルは閉じない） |
| モーダル中のキー操作 | 通常ショートカットを無効化 |
| ブラウザ競合チェック | キャプチャ方式（イベントが届いたキーのみ受け付ける） |
| Esc × 3 カウント | モーダルが閉じたらリセット |
| 設定変更の反映 | `initSettingsModal` がコールバックで通知、`main.ts` が再取得・再描画 |
| `isModalOpen` | `settings-modal.ts` からエクスポートし `main.ts` で使用 |
| 修飾キー設定 | チェックボックスのみで制御（キャプチャ時に modifier は変更しない） |
| 重複ショートカット | import 時にエラー。キャプチャ UI では即時エラー表示 |
| アクセシビリティ | 当面考慮しない |

---

## 型定義

### `src/settings.ts`（旧 `src/shortcuts.ts` 改名・拡張）

```ts
/** 単一ショートカットキーの定義 */
export type ShortcutKey = {
  readonly key: string;
  readonly modifier: boolean;
};

/** ショートカット設定 */
export type ShortcutConfig = {
  readonly playPause:   ShortcutKey;
  readonly seekBack:    ShortcutKey;
  readonly seekForward: ShortcutKey;
  readonly download:    ShortcutKey;
};

/** seek 秒数設定 */
export type SeekConfig = {
  readonly backSeconds:    number;
  readonly forwardSeconds: number;
};

/** アプリ全体の設定 */
export type Settings = {
  readonly shortcuts: ShortcutConfig;
  readonly seek:      SeekConfig;
};

/** デフォルト設定 */
export const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    playPause:   { key: 'Enter',      modifier: true },
    seekBack:    { key: 'ArrowLeft',  modifier: true },
    seekForward: { key: 'ArrowRight', modifier: true },
    download:    { key: 's',          modifier: true },
  },
  seek: {
    backSeconds:    10,
    forwardSeconds: 10,
  },
} as const;
```

---

## localStorage スキーマ

キー: `"settings"`
値: 以下の JSON 文字列

```json
{
  "version": 1,
  "shortcuts": {
    "playPause":   { "key": "Enter",      "modifier": true },
    "seekBack":    { "key": "ArrowLeft",  "modifier": true },
    "seekForward": { "key": "ArrowRight", "modifier": true },
    "download":    { "key": "s",          "modifier": true }
  },
  "seek": {
    "backSeconds":    10,
    "forwardSeconds": 10
  }
}
```

localStorage に値がない場合、または parse に失敗した場合は `DEFAULT_SETTINGS` にフォールバックする。

---

## ファイル構成と変更内容

### `src/settings.ts` — 新規（旧 `shortcuts.ts` 改名・拡張）

上記「型定義」参照。`ShortcutKey`・`ShortcutConfig` はそのまま保持し、
`SeekConfig`・`Settings`・`DEFAULT_SETTINGS` を追加する。
`DEFAULT_SHORTCUTS` は削除し `DEFAULT_SETTINGS.shortcuts` で代替。

---

### `src/settings-storage.ts` — 新規作成

localStorage の読み書きと settings.json の import/export を担当する。

```ts
import { Settings, DEFAULT_SETTINGS } from './settings.ts';

const STORAGE_KEY = 'settings';

/** localStorage から設定を読み込む。存在しない・壊れている場合は DEFAULT_SETTINGS を返す */
export function loadSettings(): Settings

/** settings を localStorage に保存する */
export function saveSettings(settings: Settings): void

/**
 * settings を `settings.json` としてダウンロードする。
 * ファイル名は常に `settings.json` 固定。
 */
export function exportSettings(settings: Settings): void

/**
 * settings.json ファイルを読み込み、バリデーションを通過した場合は
 * localStorage に保存して onSuccess を呼び出す。
 * バリデーションに失敗した場合は onError を呼び出し、localStorage は変更しない。
 */
export function importSettings(
  file: File,
  onSuccess: (settings: Settings) => void,
  onError: (message: string) => void,
): void
```

#### import バリデーション規則

以下のいずれかに該当する場合はエラーとして `onError` を呼び出す:

1. JSON parse に失敗
2. `version` フィールドが存在しない、または `1` でない（未知バージョンは拒否）
3. `shortcuts` に `playPause`・`seekBack`・`seekForward`・`download` の 4 キーが揃っていない
4. `shortcuts` の各エントリで `key`（string）または `modifier`（boolean）が欠けている
5. `seek.backSeconds` / `seek.forwardSeconds` が正の数値でない
6. `shortcuts` 内で同一の `{ key, modifier }` の組み合わせが重複している（例: seekBack と seekForward が同じキー）

---

### `src/settings-modal.ts` — 新規作成

モーダルの表示・非表示制御、Esc × 3 検出、キャプチャ UI を担当する。

#### エクスポート

```ts
/** モーダルが現在開いているかを返す */
export function isModalOpen(): boolean

/** モーダルを初期化する。設定が保存されたとき onSave を呼び出す */
export function initSettingsModal(onSave: () => void): void
```

`isModalOpen` は `main.ts` の `keydown` ガードで使用する。
`onSave` は `main.ts` が渡すコールバック。モーダル内で「保存」「import」「reset」が実行されたときに呼び出す。

#### Esc × 3 検出ロジック

ローリングウィンドウ方式: 直前の Esc 押下から 1500ms 以内に次の Esc を押すとカウントが進む。

```text
状態: escCount（0〜3）, lastEscTime（timestamp, 初期値 0）
TIME_WINDOW = 1500ms

document の keydown（バブリングフェーズ）で Escape を受け取ったとき:
  if モーダルが開いている:
    モーダルを閉じる
    escCount = 0
    return
  now = Date.now()
  if now - lastEscTime > TIME_WINDOW:
    escCount = 1   ← タイムアウト後は 1 からカウント開始
  else:
    escCount++
  lastEscTime = now
  if escCount >= 3:
    モーダルを開く
    escCount = 0
```

**ポイント:**

- タイムアウト時は `escCount = 1` に直接セット（リセット後に 1 押した扱い）
- `>= 3` の条件で判定するため、カウントが積み上がってもモーダルが誤起動しない

#### イベントリスナーの登録

Esc × 3 リスナーは `document` に **バブリングフェーズ**（`capture: false`）で登録する。
これにより、`editor` の `keydown` ガード（`if (isModalOpen()) return`）と干渉しない。
モーダルが開いている間の Esc はこのリスナーで捕捉してモーダルを閉じる。

#### ショートカットキャプチャ UI

各ショートカット行にキャプチャボタンを配置する。
ボタンをクリックするとキャプチャモードになり、
次の `keydown` イベントの `event.key` を新しいキーとして記録する。

キャプチャ規則:

- `event.key === 'Escape'` → キャプチャをキャンセル（ショートカット未変更、**モーダルは閉じない**）
- `event.key` が `'Meta'`・`'Control'`・`'Shift'`・`'Alt'` → 無視（修飾キー単体は不可）
- その他 → キーとして採用。**modifier は変更しない**（チェックボックスで独立制御）

**キャプチャ中の視覚フィードバック:** キャプチャモードに入ったボタンは「キャプチャ中...」などのラベルに切り替え、
モーダル内の他の操作（他のキャプチャボタン、保存、Esc でのモーダルクローズ）が
抑制されていることをユーザーが認識できるようにする。
キャプチャがキャンセルまたは確定した時点でボタンを元のラベルに戻す。

modifier（修飾キー要否）は各行のチェックボックスで設定する。
チェックボックスの変更はキャプチャと独立しており、即時 UI に反映される（未保存状態）。

**重複チェック:** キャプチャ確定時に他のショートカットと `{ key, modifier }` が一致する場合は
インライン警告を表示し、その変更を却下する（既存の値を保持）。

#### 設定の保存フロー

モーダル内の変更はすべて未保存状態として UI に保持する。
「保存」ボタンをクリックしたとき:

1. `saveSettings(currentDraft)` で localStorage に書き込む
2. `onSave()` を呼び出す（`main.ts` 側で設定を再取得・再描画）
3. モーダルを閉じる

「キャンセル」（Esc で閉じる）の場合はドラフトを破棄し、変更を反映しない。

---

### `src/player.ts` — 改修

- import を `./shortcuts.ts` → `./settings.ts` に変更
- 引数 `shortcuts: ShortcutConfig` を `settings: Settings` に変更し、
  seek 秒数を `settings.seek.backSeconds` / `settings.seek.forwardSeconds` から取得する

```ts
import type { Settings } from './settings.ts';

export function handlePlayerKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  settings: Settings,
  announce: (message: string) => void,
  mac = isMac,
): void {
  // ...
  player.currentTime = Math.max(0, player.currentTime - settings.seek.backSeconds);
  player.currentTime = Math.min(player.duration, player.currentTime + settings.seek.forwardSeconds);
  // ...
}
```

announce のメッセージも動的に変更する（例: `` `${settings.seek.backSeconds}秒戻る` ``）。

---

### `src/download.ts` — 改修

- import を `./shortcuts.ts` → `./settings.ts` に変更
- 引数型 `ShortcutConfig` は変わらず、import 元のみ変更

---

### `src/keyboard.ts` — 改修

- import を `./shortcuts.ts` → `./settings.ts` に変更
- `updateShortcutDisplay(shortcuts: ShortcutConfig)` → `updateShortcutDisplay(settings: Settings)` に変更
- 既存の `#editor[aria-keyshortcuts]` および `#editor[placeholder]` の更新処理は**そのまま保持**する
- フッターの seek 秒数表示も動的に更新するため、`<span data-seek>` 要素を更新する:
  - `document.querySelector('[data-seek="back"]')` → `textContent = String(settings.seek.backSeconds)`
  - `document.querySelector('[data-seek="forward"]')` → `textContent = String(settings.seek.forwardSeconds)`

---

### `src/main.ts` — 改修

- `DEFAULT_SHORTCUTS` → `DEFAULT_SETTINGS` への参照変更
- 起動時に `loadSettings()` で localStorage から設定を読み込む
- `initSettingsModal(onSave)` を呼び出してモーダルを初期化する
- `onSave` コールバック内で設定を再取得し、リスナーとアプリ状態を更新する

```ts
import { loadSettings } from './settings-storage.ts';
import { initSettingsModal, isModalOpen } from './settings-modal.ts';

let settings = loadSettings();

editor.addEventListener('keydown', (event: KeyboardEvent) => {
  if (isModalOpen()) return;  // モーダルが開いている間は無効化
  handleDownloadKeydown(event, editor, downloadStatus, settings.shortcuts, announce);
  handlePlayerKeydown(event, player, settings, announce);
});

updateShortcutDisplay(settings);

initSettingsModal(() => {
  // モーダルで保存されたとき: 設定を再取得して表示を更新
  settings = loadSettings();
  updateShortcutDisplay(settings);
});
```

`settings` は `let` で宣言し、`onSave` コールバック内で `loadSettings()` により再代入する。
以後のキーイベントは自動的に新しい `settings` を参照する（クロージャ経由）。

---

### `index.html` — 改修

フッターの seek 秒数表示に `data-seek` 属性を持つ `<span>` を追加する。
モーダル HTML を `<div id="app">` 内末尾に追加する。

```html
<!-- フッター変更: span[data-seek] でテキスト部分を分離 -->
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekBack">←</kbd>: <span data-seek="back">10</span>秒戻る</li>
<li><kbd data-mod>Ctrl</kbd> + <kbd data-key="seekForward">→</kbd>: <span data-seek="forward">10</span>秒進む</li>

<!-- モーダル追加 -->
<div id="settings-modal" hidden>
  <h2>設定</h2>

  <section>
    <h3>ショートカット</h3>
    <ul>
      <li>
        <span>再生 / 一時停止</span>
        <button data-capture="playPause"></button>
        <label><input type="checkbox" data-modifier="playPause"> 修飾キー</label>
        <span data-capture-error="playPause" hidden></span>
      </li>
      <li>
        <span>戻る</span>
        <button data-capture="seekBack"></button>
        <label><input type="checkbox" data-modifier="seekBack"> 修飾キー</label>
        <span data-capture-error="seekBack" hidden></span>
      </li>
      <li>
        <span>進む</span>
        <button data-capture="seekForward"></button>
        <label><input type="checkbox" data-modifier="seekForward"> 修飾キー</label>
        <span data-capture-error="seekForward" hidden></span>
      </li>
      <li>
        <span>保存</span>
        <button data-capture="download"></button>
        <label><input type="checkbox" data-modifier="download"> 修飾キー</label>
        <span data-capture-error="download" hidden></span>
      </li>
    </ul>
  </section>

  <section>
    <h3>シーク秒数</h3>
    <label>戻る（秒）<input type="number" id="seekBackSeconds" min="1" max="60"></label>
    <label>進む（秒）<input type="number" id="seekForwardSeconds" min="1" max="60"></label>
  </section>

  <div>
    <button id="saveSettings">保存</button>
    <button id="exportSettings">書き出し</button>
    <label>読み込み<input type="file" id="importSettingsFile" accept=".json"></label>
    <button id="resetSettings">リセット</button>
    <p id="settings-error" hidden></p>
  </div>
</div>
```

---

## テスト方針

### 新規テスト: `src/settings-storage.test.ts`

- `loadSettings()`: localStorage が空 → `DEFAULT_SETTINGS` を返す
- `loadSettings()`: 正常な JSON → パースして返す
- `loadSettings()`: 壊れた JSON → `DEFAULT_SETTINGS` を返す
- `saveSettings()`: localStorage に正しく書き込まれる
- `exportSettings()`: `settings.json` のファイル名でダウンロードが発火する
- `importSettings()`: 正常ファイル → onSuccess が呼ばれる
- `importSettings()`: 壊れた JSON → onError が呼ばれる、localStorage 変更なし
- `importSettings()`: `version` が 1 以外 → onError が呼ばれる
- `importSettings()`: ショートカットキーが不足（3 件）→ onError が呼ばれる
- `importSettings()`: 重複ショートカット → onError が呼ばれる
- `importSettings()`: `seek.backSeconds` が 0 → onError が呼ばれる

### 新規テスト: `src/settings-modal.test.ts`

**Esc × 3 検出:**

- Esc × 3（各押下間隔 < 1500ms）→ モーダルが開く
- Esc × 3（2 回目押下が 1500ms 超過）→ カウントリセット、モーダルが開かない
- モーダルが開いている状態で Esc → モーダルが閉じる
- モーダルが閉じた後 escCount が 0 にリセットされる

**キャプチャ UI:**

- キャプチャボタンクリック → キャプチャモードになる
- キャプチャ中に Escape → キャプチャキャンセル（値は変わらない）
- キャプチャ中に修飾キー単体（Meta など）→ 無視
- キャプチャ中に通常キー → キーとして採用、modifier は変わらない
- 重複するキーをキャプチャ → インライン警告が表示され、値は変わらない

**保存・キャンセル:**

- 「保存」クリック → `saveSettings` が呼ばれ、`onSave` コールバックが呼ばれる
- Esc でモーダルを閉じる（キャンセル）→ `saveSettings` が呼ばれない
- 「リセット」クリック → `DEFAULT_SETTINGS` で `saveSettings` が呼ばれ、`onSave` が呼ばれる。モーダルは閉じず、デフォルト値を表示したまま開いた状態を維持する

### 既存テストの変更

- `player.test.ts`: `shortcuts` 引数 → `settings` 引数に変更。seek 秒数テストを追加
- `download.test.ts`: import 元を `./shortcuts.ts` → `./settings.ts` に変更（型は変わらず）
- `keyboard.test.ts`: `updateShortcutDisplay` の引数を `Settings` に変更。`data-seek` span の更新を検証

---

## 変更対象ファイル一覧

| ファイル | 変更種別 |
| --- | --- |
| `src/shortcuts.ts` | 削除（settings.ts に統合） |
| `src/settings.ts` | 新規作成（旧 shortcuts.ts 改名・拡張） |
| `src/settings-storage.ts` | 新規作成 |
| `src/settings-storage.test.ts` | 新規作成 |
| `src/settings-modal.ts` | 新規作成 |
| `src/settings-modal.test.ts` | 新規作成 |
| `src/player.ts` | 改修（Settings 型対応・seek 秒数動的化） |
| `src/player.test.ts` | 改修（Settings 型対応） |
| `src/download.ts` | 改修（import 元変更） |
| `src/keyboard.ts` | 改修（import 元変更・Settings 型対応・data-seek 更新） |
| `src/keyboard.test.ts` | 改修（Settings 型対応・data-seek 検証追加） |
| `src/main.ts` | 改修（loadSettings・initSettingsModal・onSave コールバック追加） |
| `index.html` | 改修（モーダル HTML・span[data-seek] 属性追加） |
