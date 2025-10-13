import { test, expect } from '@playwright/test';
import { ConsoleMonitor } from '../helpers/console-monitor';

test.describe('コンソールエラー検知', () => {
  test('トップページでコンソールエラーがないこと', async ({ page }) => {
    const monitor = new ConsoleMonitor(page, 'Top');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    monitor.ignorePattern(/React Router Future Flag Warning/);
    expect(monitor.getErrorCount()).toBe(0);
  });
});
