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
