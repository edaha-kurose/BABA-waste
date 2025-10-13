-- ============================================================================
-- Seed: JWNET事業者組み合わせマスター
-- ============================================================================
-- 目的: JWNET WebEDI対応の事業者組み合わせサンプルデータ
-- 作成日: 2025-10-13
-- 注意: organizations のデータが必要
-- ============================================================================

-- 既存データチェック
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM app.jwnet_party_combinations LIMIT 1) THEN
    RAISE NOTICE 'jwnet_party_combinations already has data. Skipping seed.';
  ELSE
    -- 組織IDを取得（最初の組織を使用）
    SELECT id INTO v_org_id FROM app.organizations ORDER BY created_at LIMIT 1;
    
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION '❌ No organizations found. Please seed organizations first.';
    END IF;

    -- RLS無効化（管理者権限で実行）
    ALTER TABLE app.jwnet_party_combinations DISABLE ROW LEVEL SECURITY;

    -- サンプル事業者組み合わせ挿入
    INSERT INTO app.jwnet_party_combinations (
      org_id,
      emitter_org_id,
      emitter_subscriber_no,
      emitter_public_confirm_no,
      emitter_name,
      emitter_address,
      emitter_postal_code,
      transporter_org_id,
      transporter_subscriber_no,
      transporter_public_confirm_no,
      transporter_name,
      transporter_address,
      transporter_postal_code,
      transporter_phone,
      disposer_org_id,
      disposer_subscriber_no,
      disposer_public_confirm_no,
      disposer_name,
      disposer_address,
      disposer_postal_code,
      disposer_phone,
      is_active,
      valid_from,
      valid_to,
      notes
    ) VALUES
    -- 組み合わせ1: 標準パターン
    (
      v_org_id,
      v_org_id, '1234567', 'ABC123', '株式会社サンプル排出事業者',
      '東京都千代田区丸の内1-1-1', '100-0001',
      v_org_id, '7654321', 'XYZ789', '株式会社サンプル収集運搬業者',
      '東京都江東区豊洲3-3-3', '135-0061', '03-1234-5678',
      v_org_id, '9876543', 'DEF456', '株式会社サンプル処分業者',
      '神奈川県横浜市港北区新横浜2-2-2', '222-0033', '045-9876-5432',
      true,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 year',
      'テスト用の標準的な事業者組み合わせ'
    ),
    
    -- 組み合わせ2: 別パターン
    (
      v_org_id,
      v_org_id, '1111111', 'AAA111', '株式会社テスト排出事業者A',
      '大阪府大阪市中央区本町1-1-1', '541-0053',
      v_org_id, '2222222', 'BBB222', '株式会社テスト収集運搬業者A',
      '大阪府大阪市住之江区南港北2-2-2', '559-0034', '06-1234-5678',
      v_org_id, '3333333', 'CCC333', '株式会社テスト処分業者A',
      '兵庫県神戸市中央区港島3-3-3', '650-0046', '078-9876-5432',
      true,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '2 years',
      '関西エリアの事業者組み合わせ'
    );

    RAISE NOTICE '✅ Seeded % jwnet_party_combinations', (SELECT COUNT(*) FROM app.jwnet_party_combinations);

    -- RLS再有効化
    ALTER TABLE app.jwnet_party_combinations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

