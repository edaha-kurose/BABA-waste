#!/bin/bash

echo "🔍 全ページのデータ取得ロジック確認"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 各ページのsetState呼び出しをチェック"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 廃棄依頼一覧
echo "1. 廃棄依頼一覧 (waste-requests):"
grep -n "setRequests" next-app/src/app/dashboard/waste-requests/page.tsx | grep -v "useState"
echo ""

# 予定管理
echo "2. 予定管理 (plans):"
grep -n "setPlans" next-app/src/app/dashboard/plans/page.tsx | grep -v "useState"
echo ""

# 回収レポート
echo "3. 回収レポート (collection-report):"
grep -n "setReports" next-app/src/app/dashboard/collection-report/page.tsx | grep -v "useState"
echo ""

# 回収実績
echo "4. 回収実績 (actuals):"
grep -n "setActuals" next-app/src/app/dashboard/actuals/page.tsx | grep -v "useState"
echo ""

# 回収情報
echo "5. 回収情報 (collections):"
grep -n "setCollections" next-app/src/app/dashboard/collections/page.tsx | grep -v "useState"
echo ""

# 請求管理
echo "6. 請求管理 (billing):"
grep -n "setBillingItems" next-app/src/app/dashboard/billing/page.tsx | grep -v "useState"
echo ""

# 一斉ヒアリング
echo "7. 一斉ヒアリング (mass-hearings):"
grep -n "setHearings" next-app/src/app/dashboard/mass-hearings/page.tsx | grep -v "useState"
echo ""

# 外部店舗
echo "8. 外部店舗 (external-stores):"
grep -n "setStores" next-app/src/app/dashboard/external-stores/page.tsx | grep -v "useState"
echo ""

# 収集業者
echo "9. 収集業者 (collectors):"
grep -n "setCollectors" next-app/src/app/dashboard/collectors/page.tsx | grep -v "useState"
echo ""

# 店舗管理
echo "10. 店舗管理 (stores):"
grep -n "setStores" next-app/src/app/dashboard/stores/page.tsx | grep -v "useState"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"




