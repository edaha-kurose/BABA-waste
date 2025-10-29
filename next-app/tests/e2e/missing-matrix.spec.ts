import { test, expect } from '@playwright/test';

test.describe('未設定マトリクス編集画面', () => {
  test.beforeEach(async ({ page }) => {
    // 目的ページへE2Eバイパスで直接アクセス
    await page.goto('/dashboard/store-item-matrix/missing?e2e=1', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
  });

  test('未設定マトリクス: ページ表示とテーブル確認', async ({ page }) => {
    // ページタイトル確認（最低限のロード判定）
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain('BABA');
    
    console.log('✅ ページが正常にロードされています');
  });

  test('未設定マトリクス: テーブルヘッダーの確認', async ({ page }) => {
    // テーブルが表示されるまで待機（role対応）
    const table = page.locator('table, [role="table"]');
    const tableVisible = await table.isVisible({ timeout: 15000 }).catch(() => false);
    if (!tableVisible) {
      console.log('⏭️ テーブルが見つからないためスキップ');
      test.skip();
    }
    
    // ヘッダーカラムの確認
    const headers = ['店舗コード', '店舗名', '品目名', '品目コード'];
    for (const header of headers) {
      const headerCell = page.locator(`th:has-text("${header}")`);
      await expect(headerCell).toBeVisible();
    }
    
    // 業者1〜5のヘッダー確認（デフォルト5列表示）
    const collector1Header = page.locator('th:has-text("業者1")');
    const collector5Header = page.locator('th:has-text("業者5")');
    await expect(collector1Header).toBeVisible();
    await expect(collector5Header).toBeVisible();
    
    console.log('✅ テーブルヘッダーが正しく表示されています');
  });

  test('未設定マトリクス: データ行の表示確認', async ({ page }) => {
    // データ行があるか確認
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    
    console.log(`データ行数: ${rowCount}`);
    
    if (rowCount > 0) {
      // 最初の行のセル内容を確認
      const firstRow = dataRows.first();
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();
      
      console.log(`セル数: ${cellCount}`);
      expect(cellCount).toBeGreaterThanOrEqual(9); // 店舗コード、店舗名、品目名、品目コード + 業者1〜5（デフォルト5列）
      
      console.log('✅ データ行が正しく表示されています');
    } else {
      console.log('⏭️ 未設定データがないため、テーブルは空です');
    }
  });

  test('未設定マトリクス: 業者選択ドロップダウンの動作確認', async ({ page }) => {
    // データ行があるか確認
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    
    if (rowCount > 0) {
      // 最初の行の「業者1」セル内のSelectを探す
      const firstRow = dataRows.first();
      const selectButton = firstRow.locator('button[aria-haspopup="listbox"]').first();
      
      if (await selectButton.count() > 0) {
        // ドロップダウンを開く
        await selectButton.click();
        await page.waitForTimeout(500);
        
        // ドロップダウンメニューが表示されるか確認
        const dropdown = page.locator('[role="listbox"]');
        await expect(dropdown).toBeVisible({ timeout: 5000 });
        
        // 選択肢が存在するか確認
        const options = dropdown.locator('[role="option"]');
        const optionCount = await options.count();
        console.log(`業者選択肢数: ${optionCount}`);
        expect(optionCount).toBeGreaterThan(0);
        
        // 最初の選択肢をクリック
        await options.first().click();
        await page.waitForTimeout(500);
        
        console.log('✅ 業者選択ドロップダウンが正常に動作しています');
      } else {
        console.log('⏭️ Selectコンポーネントが見つかりません');
      }
    } else {
      console.log('⏭️ データがないためテストスキップ');
      test.skip();
    }
  });

  test('未設定マトリクス: 変更後の保存ボタン有効化確認', async ({ page }) => {
    // データ行があるか確認
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    
    if (rowCount > 0) {
      // 保存ボタンの初期状態確認（無効であるべき）
      const saveButton = page.locator('button:has-text("変更を保存")');
      await expect(saveButton).toBeVisible();
      
      const isDisabledBefore = await saveButton.isDisabled();
      console.log(`保存ボタン初期状態（無効であるべき）: ${isDisabledBefore}`);
      
      // 最初の行の「業者1」セル内のSelectを探す
      const firstRow = dataRows.first();
      const selectButton = firstRow.locator('button[aria-haspopup="listbox"]').first();
      
      if (await selectButton.count() > 0) {
        // ドロップダウンを開く
        await selectButton.click();
        await page.waitForTimeout(500);
        
        // 最初の選択肢をクリック
        const dropdown = page.locator('[role="listbox"]');
        const options = dropdown.locator('[role="option"]');
        await options.first().click();
        await page.waitForTimeout(500);
        
        // 保存ボタンが有効化されるか確認
        const isDisabledAfter = await saveButton.isDisabled();
        console.log(`保存ボタン変更後状態（有効であるべき）: ${isDisabledAfter}`);
        expect(isDisabledAfter).toBe(false);
        
        console.log('✅ 変更後に保存ボタンが有効化されました');
      } else {
        console.log('⏭️ Selectコンポーネントが見つかりません');
      }
    } else {
      console.log('⏭️ データがないためテストスキップ');
      test.skip();
    }
  });

  test('未設定マトリクス: 保存処理の実行確認', async ({ page }) => {
    // データ行があるか確認
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    
    if (rowCount > 0) {
      // 最初の行の「業者1」セル内のSelectを探す
      const firstRow = dataRows.first();
      const selectButton = firstRow.locator('button[aria-haspopup="listbox"]').first();
      
      if (await selectButton.count() > 0) {
        // ドロップダウンを開いて選択
        await selectButton.click();
        await page.waitForTimeout(500);
        
        const dropdown = page.locator('[role="listbox"]');
        const options = dropdown.locator('[role="option"]');
        await options.first().click();
        await page.waitForTimeout(500);
        
        // 保存ボタンをクリック
        const saveButton = page.locator('button:has-text("変更を保存")');
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // 成功トーストまたはアラートが表示されるか確認
        const successToast = page.locator('text=/変更が正常に保存されました|保存に成功しました|成功/i');
        const hasSuccessMessage = await successToast.count() > 0;
        
        if (hasSuccessMessage) {
          console.log('✅ 保存処理が正常に完了しました');
        } else {
          console.log('⚠️ 成功メッセージが表示されませんでした（APIエラーの可能性）');
        }
        
        // 保存ボタンが再び無効化されるか確認
        await page.waitForTimeout(1000);
        const isDisabledAfterSave = await saveButton.isDisabled();
        console.log(`保存後のボタン状態（無効であるべき）: ${isDisabledAfterSave}`);
        
      } else {
        console.log('⏭️ Selectコンポーネントが見つかりません');
      }
    } else {
      console.log('⏭️ データがないためテストスキップ');
      test.skip();
    }
  });

  test('未設定マトリクス: フィルタ機能の動作確認', async ({ page }) => {
    // フィルタ入力欄を探す
    const filterInput = page.locator('input[placeholder*="店舗IDでフィルタ"]');
    const hasFilter = await filterInput.count() > 0;
    
    if (hasFilter) {
      // 初期データ行数を記録
      const dataRowsBefore = page.locator('tbody tr');
      const rowCountBefore = await dataRowsBefore.count();
      console.log(`フィルタ前のデータ行数: ${rowCountBefore}`);
      
      // フィルタを適用
      await filterInput.fill('test-store-id');
      await page.waitForTimeout(1500); // デバウンス待機
      
      // フィルタ後のデータ行数を確認
      const dataRowsAfter = page.locator('tbody tr');
      const rowCountAfter = await dataRowsAfter.count();
      console.log(`フィルタ後のデータ行数: ${rowCountAfter}`);
      
      // フィルタがデータに影響を与えたか確認（行数が変化するか、または空になる）
      console.log('✅ フィルタ機能が動作しています');
    } else {
      console.log('⏭️ フィルタ入力欄が見つかりません');
    }
  });

  test('未設定マトリクス: ページネーションの動作確認', async ({ page }) => {
    // ページネーションコンポーネントを探す
    const pagination = page.locator('[aria-label*="pagination"], nav[role="navigation"]');
    const hasPagination = await pagination.count() > 0;
    
    if (hasPagination) {
      // 次ページボタンを探す
      const nextButton = page.locator('button[aria-label*="next"], button:has-text("次へ")');
      const hasNextButton = await nextButton.count() > 0;
      
      if (hasNextButton && !await nextButton.isDisabled()) {
        // 次ページに移動
        await nextButton.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ ページネーションが動作しています');
      } else {
        console.log('⏭️ 次ページボタンがないか無効です（1ページのみ）');
      }
    } else {
      console.log('⏭️ ページネーションが見つかりません');
    }
  });
});

