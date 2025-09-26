// ============================================================================
// 予定データ取り込み Edge Function
// 作成日: 2025-09-16
// 目的: CSV/JSON形式の予定データを正規化して取り込む
// ============================================================================

import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { IngestPlansRequestSchema, IngestPlansResponseSchema } from "@contracts/v0/schema"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 認証チェック
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // JWTからorg_idを取得
    const token = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(token.split('.')[1]))
    const orgId = payload.org_id

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: '組織IDが見つかりません' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // リクエストボディを解析
    const body = await req.json()
    
    // バリデーション
    const validationResult = IngestPlansRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'リクエスト形式が正しくありません',
          details: validationResult.error.errors
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { rows } = validationResult.data
    let processedCount = 0

    // 各レコードをステージングテーブルに挿入
    for (const raw of rows) {
      try {
        const { error: insertError } = await supabase
          .from('stage_plans')
          .insert({
            org_id: orgId,
            raw: raw,
          })

        if (insertError) {
          console.error('Failed to insert stage plan:', insertError)
          continue
        }

        processedCount++
      } catch (error) {
        console.error('Error processing row:', error)
        continue
      }
    }

    // ステージングデータを正規化
    const { data: stagedData, error: stagedError } = await supabase
      .from('stage_plans')
      .select('id')
      .eq('org_id', orgId)
      .eq('processed', false)
      .limit(500)

    if (stagedError) {
      console.error('Failed to fetch staged data:', stagedError)
    } else if (stagedData) {
      // 各ステージングレコードを正規化
      for (const stage of stagedData) {
        try {
          const { error: normalizeError } = await supabase.rpc('normalize_stage_plans', {
            p_stage_id: stage.id
          })

          if (normalizeError) {
            console.error('Failed to normalize stage plan:', normalizeError)
          }
        } catch (error) {
          console.error('Error normalizing stage plan:', error)
        }
      }
    }

    // 予約を生成
    try {
      const { error: buildReservationsError } = await supabase.rpc('build_reservations', {
        p_org_id: orgId
      })

      if (buildReservationsError) {
        console.error('Failed to build reservations:', buildReservationsError)
      }
    } catch (error) {
      console.error('Error building reservations:', error)
    }

    // レスポンス
    const response = IngestPlansResponseSchema.parse({
      ok: true,
      processed: processedCount,
    })

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: '内部サーバーエラーが発生しました',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

