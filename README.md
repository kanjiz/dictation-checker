# 書き取りツール

音声を聴きながらテキストを書き取る練習ができるブラウザツールです。
インストール不要、ダウンロードして開くだけで使えます。

## ダウンロードと起動

1. [Releases](https://github.com/kanjiz/dictation-checker/releases) から最新の ZIP をダウンロード
2. ZIP を展開
3. `index.html` をダブルクリックして開く

> Google Chrome 推奨（Chromium ベースのブラウザで動作）

## 使い方

1. 「音声ファイルを選択してください」から音声ファイルを選ぶ
2. テキストエリアに書き取りを入力する

## キーボードショートカット

| キー | 動作 |
| --- | --- |
| Ctrl + Enter | 再生 / 一時停止 |
| Ctrl + ← | 10秒戻る |
| Ctrl + → | 10秒進む |

## 開発者向け

### 必要環境

- Node.js 24.14.0 以上

### セットアップ

```bash
npm install
npx playwright install chromium  # テスト用ブラウザをインストール
npm run dev      # 開発サーバー起動
npm test         # テスト実行
npm run build    # ビルド（dist/ に出力）
```

## ライセンス

MIT
