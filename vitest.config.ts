import { defineConfig } from 'vitest/config';
// Vitest 4 では文字列 'playwright' ではなく型付きプロバイダーファクトリを使用する
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      // Node.js ではなく実ブラウザ上でテストを実行する
      // DOM API や file:// プロトコル依存の挙動を正確に検証するため
      enabled: true,
      // Playwright をブラウザ操作エンジンとして使用する
      provider: playwright(),
      // CI と同じ Chromium 1 インスタンスで実行（クロスブラウザは不要）
      instances: [{ browser: 'chromium' }],
    },
  },
});
