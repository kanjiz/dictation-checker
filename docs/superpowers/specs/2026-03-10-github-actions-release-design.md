# 設計書: GitHub Actions CI/CD + リリース自動化

- 日付: 2026-03-10
- ステータス: 承認済み

## 概要

Vite ビルドの成果物を GitHub Releases からダウンロードできるようにする。
ダウンロードした ZIP を解凍して `index.html` をダブルクリックするだけで動作させる。

あわせて、PR 時にテストを自動実行する CI ワークフローも追加する。

## 目標

- `index.html` をダブルクリックするだけで起動できる（Node.js 不要）
- タグを push するだけで GitHub Release が自動作成される
- PR 時にテストが自動実行される

## アーキテクチャ

### ファイル構成

| ファイル | 変更 | 役割 |
| --- | --- | --- |
| `vite.config.ts` | 新規 | `base: './'` で相対パスビルドを有効化 |
| `.github/workflows/ci.yml` | 新規 | PR・main push 時のテスト実行 |
| `.github/workflows/release.yml` | 新規 | `v*` タグ push 時のビルド・ZIP・Release 作成 |

### リリースフロー

```text
feature ブランチで作業
    ↓ PR → main にマージ
git checkout main && git pull
git tag v1.0.0 && git push origin v1.0.0
    ↓ GitHub Actions が起動（release.yml）
テスト → ビルド → ZIP → GitHub Release に添付
```

### ZIPの中身

```text
dictation-checker-v1.0.0.zip
├── index.html
└── assets/
    ├── main-xxxxx.js
    └── style-xxxxx.css
```

## 詳細設計

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

`base: './'` により、ビルド成果物のパスが絶対パス（`/assets/...`）から
相対パス（`./assets/...`）になる。これにより `file://` プロトコルでの動作が可能になる。

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - name: Cache Playwright browsers
        uses: actions/cache@v5
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-chromium-${{ hashFiles('package-lock.json') }}
      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps
        if: steps.playwright-cache.outputs.cache-hit != 'true'
      - run: npm test
```

### `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - name: Cache Playwright browsers
        uses: actions/cache@v5
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-chromium-${{ hashFiles('package-lock.json') }}
      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps
        if: steps.playwright-cache.outputs.cache-hit != 'true'
      - run: npm test
      - run: npm run build
      - name: ZIP the dist
        run: |
          cd dist
          zip -r ../dictation-checker-${{ github.ref_name }}.zip .
      - uses: softprops/action-gh-release@v2
        with:
          files: dictation-checker-${{ github.ref_name }}.zip
```

テスト失敗時はリリースが中断される。

## リリース手順

```bash
# 1. GitHub で PR をマージ
# 2. ローカルを最新化
git checkout main
git pull

# 3. タグを打って push → GitHub Actions が自動実行
git tag v1.0.0
git push origin v1.0.0
```

## README への記載（後続タスク）

GitHub Releases が整備された後、`README.md` にダウンロード・使い方の手順を記載する。
