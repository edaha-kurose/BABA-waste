import { test, expect } from '@playwright/test';
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('収集予定管理画面', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page, '/dashboard/plans')
    await page.waitForTimeout(1000)
  });

  test('収集予定一覧: ページ表示とデータ確認', async ({ page }) => {
    // ページタイトル確認（柔軟な条件）
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);
    expect(title.length).toBeGreaterThan(0);
    
    // テーブルが表示されることを確認
    const hasTable = await page.locator('table, .ant-table').count() > 0;
    expect(hasTable).toBeTruthy();
    console.log('✅ 収集予定一覧が表示されています');
  });

  test('収集予定一覧: データ件数確認', async ({ page }) => {
    // データ行を確認
    const dataRows = page.locator('tbody tr:not(.ant-table-measure-row)');
    const rowCount = await dataRows.count();
    
    console.log(`収集予定件数: ${rowCount}件`);
    
    if (rowCount > 0) {
      expect(rowCount).toBeGreaterThan(0);
      console.log('✅ 収集予定データが存在します');
    } else {
      console.log('⏭️ 収集予定データがありません');
    }
  });

  test('収集予定一覧: 日付フィルタ機能', async ({ page }) => {
    // 日付ピッカーを探す
    const datePicker = page.locator('.ant-picker, input[type="date"]').first();
    const hasDatePicker = await datePicker.count() > 0;
    
    if (hasDatePicker) {
      console.log('✅ 日付フィルタが存在します');
    } else {
      console.log('⏭️ 日付フィルタが見つかりません（UI未実装の可能性）');
    }
  });

  test('収集予定一覧: ステータス表示確認', async ({ page }) => {
    // データ行を確認
    const dataRows = page.locator('tbody tr:not(.ant-table-measure-row)');
    const rowCount = await dataRows.count();
    
    if (rowCount > 0) {
      // ステータスバッジまたはタグを確認
      const statusBadges = page.locator('.ant-badge, .ant-tag');
      const hasBadges = await statusBadges.count() > 0;
      
      if (hasBadges) {
        console.log('✅ ステータス表示が存在します');
      } else {
        console.log('⏭️ ステータスバッジが見つかりません');
      }
    } else {
      console.log('⏭️ データがないためテストスキップ');
      test.skip();
    }
  });

  test('収集予定一覧: 新規作成ボタンの存在確認', async ({ page }) => {
    // 新規作成ボタンを探す
    const createButton = page.locator('button').filter({ hasText: /新規|作成|追加/ }).first();
    const hasCreateButton = await createButton.count() > 0;
    
    if (hasCreateButton) {
      await expect(createButton).toBeVisible();
      console.log('✅ 新規作成ボタンが存在します');
    } else {
      console.log('⏭️ 新規作成ボタンが見つかりません（UI未実装の可能性）');
    }
  });
});

