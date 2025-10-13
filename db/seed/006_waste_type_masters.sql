-- ============================================================================
-- Seed: 廃棄物種別マスター（収集業者ごとの取り扱い廃棄物）
-- ============================================================================
-- 目的: 収集業者が取り扱う廃棄物種別のサンプルデータ
-- 作成日: 2025-10-13
-- 注意: organizations, jwnet_waste_codes のデータが必要
-- ============================================================================

-- 既存データチェック
DO $$
DECLARE
  v_org_id UUID;
  v_jwnet_general_waste_id UUID;
  v_jwnet_industrial_waste_id UUID;
  v_jwnet_can_id UUID;
  v_jwnet_bottle_id UUID;
  v_jwnet_cardboard_id UUID;
  v_jwnet_plastic_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM app.waste_type_masters LIMIT 1) THEN
    RAISE NOTICE 'waste_type_masters already has data. Skipping seed.';
  ELSE
    -- 組織IDを取得（最初の組織を使用）
    SELECT id INTO v_org_id FROM app.organizations ORDER BY created_at LIMIT 1;
    
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION '❌ No organizations found. Please seed organizations first.';
    END IF;

    -- JWNET廃棄物コードIDを取得
    SELECT id INTO v_jwnet_general_waste_id FROM app.jwnet_waste_codes WHERE waste_code = '0200101' LIMIT 1; -- 可燃ごみ
    SELECT id INTO v_jwnet_industrial_waste_id FROM app.jwnet_waste_codes WHERE waste_code = '0060101' LIMIT 1; -- 廃プラスチック
    SELECT id INTO v_jwnet_can_id FROM app.jwnet_waste_codes WHERE waste_code = '0210101' LIMIT 1; -- 缶
    SELECT id INTO v_jwnet_bottle_id FROM app.jwnet_waste_codes WHERE waste_code = '0210102' LIMIT 1; -- 瓶
    SELECT id INTO v_jwnet_cardboard_id FROM app.jwnet_waste_codes WHERE waste_code = '0210104' LIMIT 1; -- 段ボール
    SELECT id INTO v_jwnet_plastic_id FROM app.jwnet_waste_codes WHERE waste_code = '0210103' LIMIT 1; -- ペットボトル

    IF v_jwnet_general_waste_id IS NULL THEN
      RAISE EXCEPTION '❌ No jwnet_waste_codes found. Please seed jwnet_waste_codes first.';
    END IF;

    -- RLS無効化（管理者権限で実行）
    ALTER TABLE app.waste_type_masters DISABLE ROW LEVEL SECURITY;

    -- サンプル廃棄物種別マスター挿入
    INSERT INTO app.waste_type_masters (
      org_id,
      collector_id,
      waste_type_code,
      waste_type_name,
      waste_category,
      waste_classification,
      jwnet_waste_code_id,
      jwnet_waste_code,
      unit_code,
      unit_price,
      billing_category,
      billing_type_default,
      description,
      is_active
    ) VALUES
    -- 一般廃棄物（固定）
    (v_org_id, v_org_id, 'GW-001', '一般廃棄物（可燃ごみ）', '一般廃棄物', '可燃', v_jwnet_general_waste_id, '0200101', '01', 0, 'G', 'FIXED', '月額固定の可燃ごみ回収', true),
    (v_org_id, v_org_id, 'GW-002', '一般廃棄物（不燃ごみ）', '一般廃棄物', '不燃', v_jwnet_general_waste_id, '0200101', '01', 0, 'G', 'FIXED', '月額固定の不燃ごみ回収', true),
    
    -- 産業廃棄物（従量）
    (v_org_id, v_org_id, 'IW-001', '産業廃棄物（廃プラスチック）', '産業廃棄物', '廃プラスチック', v_jwnet_industrial_waste_id, '0060101', '01', 50.0, 'H', 'METERED', '実績ベースの廃プラ回収（50円/kg）', true),
    (v_org_id, v_org_id, 'IW-002', '産業廃棄物（木くず）', '産業廃棄物', '木くず', v_jwnet_industrial_waste_id, '0060101', '01', 30.0, 'H', 'METERED', '実績ベースの木くず回収（30円/kg）', true),
    
    -- 瓶・缶（従量）
    (v_org_id, v_org_id, 'RC-001', '缶', '資源ごみ', '缶', v_jwnet_can_id, '0210101', '01', 10.0, 'I', 'METERED', '缶の回収（10円/kg）', true),
    (v_org_id, v_org_id, 'RC-002', '瓶', '資源ごみ', '瓶', v_jwnet_bottle_id, '0210102', '01', 15.0, 'I', 'METERED', '瓶の回収（15円/kg）', true),
    
    -- 臨時回収（従量）
    (v_org_id, v_org_id, 'TP-001', '臨時回収（粗大ごみ）', '臨時回収', '粗大ごみ', v_jwnet_general_waste_id, '0200101', '01', 100.0, 'J', 'METERED', '臨時回収による粗大ごみ（100円/kg）', true),
    (v_org_id, v_org_id, 'TP-002', '臨時回収（引越しごみ）', '臨時回収', 'その他', v_jwnet_general_waste_id, '0200101', '01', 150.0, 'J', 'METERED', '臨時回収による引越しごみ（150円/kg）', true),
    
    -- 段ボール（有価買取）
    (v_org_id, v_org_id, 'VB-001', '段ボール（有価買取）', '有価物', '段ボール', v_jwnet_cardboard_id, '0210104', '01', -5.0, 'M', 'METERED', '段ボールの有価買取（-5円/kg、マイナス値）', true),
    
    -- その他費用（システム管理手数料）
    (v_org_id, v_org_id, 'SYS-001', 'システム管理手数料', 'その他', 'システム', v_jwnet_general_waste_id, '0200101', '01', 0, 'F', 'FIXED', 'システム管理会社の管理手数料', true),
    
    -- ペットボトル（その他）
    (v_org_id, v_org_id, 'OT-001', 'ペットボトル', '資源ごみ', 'ペットボトル', v_jwnet_plastic_id, '0210103', '01', 8.0, 'OTHER', 'METERED', 'ペットボトルの回収（8円/kg）', true);

    RAISE NOTICE '✅ Seeded % waste_type_masters', (SELECT COUNT(*) FROM app.waste_type_masters);

    -- RLS再有効化
    ALTER TABLE app.waste_type_masters ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

