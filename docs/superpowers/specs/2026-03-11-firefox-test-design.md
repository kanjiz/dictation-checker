# Firefox テスト追加 設計書

## 概要

Firefox でのテスト実行を追加し、クロスブラウザ互換性を自動検証する。

## 変更ファイル

### vitest.config.ts

`instances` に `{ browser: 'firefox' }` を追加する。
既存の Chromium と同じテストスイートが Firefox でも実行される。

```ts
instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
```

### .github/workflows/ci.yml

- Playwright キャッシュキーを `playwright-chromium-firefox-` に変更
- インストールコマンドを `chromium firefox` に変更

### .github/workflows/release.yml

ci.yml と同様の変更を適用する。

### README.md

- L12 のブラウザ注記を更新：
  > Google Chrome 推奨（Chromium ベースのブラウザおよび Firefox で動作）
- 開発者向けセットアップのインストールコマンドを更新：
  ```bash
  npx playwright install chromium firefox  # テスト用ブラウザをインストール
  ```

## 方針

- 既存のテストスイートをそのまま両ブラウザで実行する（テストコードの変更なし）
- CI と Release ワークフローの両方で Firefox を有効にする
