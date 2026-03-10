# 設計書: Vitest ブラウザモード + キーボードショートカットテスト

- 日付: 2026-03-10
- ステータス: 承認済み

## 概要

Vitest 4 ブラウザモード（Playwright/Chromium）でキーボードショートカットのテストを書けるようにする。
あわせて、現在 `main.ts` にハードコードされているショートカットキー定義をマジックナンバーとして扱わず、
型付きの設定オブジェクトとして切り出す。

## 目標

- `Ctrl+Enter`（再生/停止）、`Ctrl+←`（10秒戻る）、`Ctrl+→`（10秒進む）の動作をテストで検証できる
- ショートカットキーの定義を一箇所に集約し、テストコードも同じ定数を参照する
- 将来の設定化（settings.json 等）に向けた拡張ポイントを確保する

## アーキテクチャ

### ファイル構成

| ファイル | 変更 | 役割 |
| --- | --- | --- |
| `src/shortcuts.ts` | 新規 | ショートカット定義の型と定数 |
| `src/player.ts` | 新規 | キーハンドラロジック（`main.ts` から抽出） |
| `src/main.ts` | 変更 | DOM取得 + イベントリスナー配線のみの薄いレイヤーに |
| `vitest.config.ts` | 新規 | Vitest ブラウザモード設定 |
| `src/player.test.ts` | 新規 | ブラウザ環境でのユニットテスト |
| `package.json` | 変更 | テストスクリプトに `--reporter=verbose` を追加 |

### データフロー

```text
src/shortcuts.ts  →  DEFAULT_SHORTCUTS（定数）
                           ↓
src/player.ts   →  handleKeydown(event, player, config, announce)
                           ↓
src/main.ts     →  DOM取得 → addEventListener で配線
```

## 詳細設計

### `src/shortcuts.ts`

```typescript
export type ShortcutKey = {
  readonly key: string;   // KeyboardEvent.key の値
  readonly ctrl: boolean;
};

export type ShortcutConfig = {
  readonly playPause:   ShortcutKey;
  readonly seekBack:    ShortcutKey;
  readonly seekForward: ShortcutKey;
};

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  playPause:   { key: 'Enter',      ctrl: true },
  seekBack:    { key: 'ArrowLeft',  ctrl: true },
  seekForward: { key: 'ArrowRight', ctrl: true },
} as const;
```

### `src/player.ts`

```typescript
import type { ShortcutConfig, ShortcutKey } from './shortcuts.ts';

export function handleKeydown(
  event: KeyboardEvent,
  player: HTMLAudioElement,
  config: ShortcutConfig,
  announce: (message: string) => void,
): void {
  const ctrlMatch = (s: ShortcutKey) => event.ctrlKey === s.ctrl && event.key === s.key;

  if (ctrlMatch(config.playPause)) {
    event.preventDefault();
    if (player.paused) { void player.play(); announce('再生'); }
    else               { player.pause();     announce('停止'); }
  } else if (ctrlMatch(config.seekBack)) {
    event.preventDefault();
    player.currentTime = Math.max(0, player.currentTime - 10);
    announce('10秒戻る');
  } else if (ctrlMatch(config.seekForward)) {
    event.preventDefault();
    player.currentTime = Math.min(player.duration, player.currentTime + 10);
    announce('10秒進む');
  }
}
```

### `src/main.ts`（変更後）

既存のキーダウンハンドラ（`switch` 文）を削除し、以下の1行に置き換える：

```typescript
editor.addEventListener('keydown', (e) => handleKeydown(e, player, DEFAULT_SHORTCUTS, announce));
```

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
// Vitest 4 では文字列 'playwright' ではなく型付きプロバイダーファクトリを使用する
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

### テストケース一覧（`src/player.test.ts`）

| テストケース | 操作 | 検証 |
| --- | --- | --- |
| 再生トリガー | Ctrl+Enter（paused=true） | `play()` 呼び出し、`announce('再生')` |
| 停止トリガー | Ctrl+Enter（再生中） | `pause()` 呼び出し、`announce('停止')` |
| 10秒戻る | Ctrl+ArrowLeft（currentTime=30） | `currentTime === 20` |
| 先頭クランプ | Ctrl+ArrowLeft（currentTime=5） | `currentTime === 0` |
| 10秒進む | Ctrl+ArrowRight（currentTime=30, duration=50） | `currentTime === 40` |
| 末尾クランプ | Ctrl+ArrowRight（currentTime=45, duration=50） | `currentTime === 50` |
| Ctrlなしは無視 | Enter のみ | `play()` 呼ばれない |
| 無関係キーは無視 | Ctrl+A | 何も起きない |

テストの前提：

- `HTMLAudioElement` は実ブラウザで生成（jsdom 不使用）
- `play()` / `pause()` は `vi.spyOn` でモック（実音声データ不要）
- `duration` は `Object.defineProperty` でテスト用の値を注入

## インストール手順

```bash
npm install -D @vitest/browser playwright
npx playwright install chromium
```

## 将来の拡張ポイント

`ShortcutConfig` を `DEFAULT_SHORTCUTS` ではなく `settings.json` やローカルストレージから読み込む形に変更しても、
`handleKeydown` のインターフェースは変わらない。`main.ts` での設定読み込み部分のみ変更すればよい。
