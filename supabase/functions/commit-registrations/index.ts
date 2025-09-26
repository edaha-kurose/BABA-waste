// ============================================================================
// 本登録データ送信 Edge Function
// 作成日: 2025-09-16
// 目的: 本登録データをJWNETに送信する
// ============================================================================

import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { CommitRegistrationsResponseSchema } from "@contracts/v0/schema"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// JWNETゲートウェイの設定
const JWNET_GATEWAY_BASEURL = Deno.env.get('JWNET_GATEWAY_BASEURL') || 'https://gw.internal/jwnet'

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアント初期化（サービスロールキー使用）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 送信待ちの本登録データを取得（実績が入っているもの）
    const { data: registrations, error: fetchError } = await supabase
      .from('registrations')
      .select(`
        id,
        org_id,
        plan_id,
        status,
        plans!inner(
          id,
          planned_date,
          planned_qty,
          unit,
          stores!inner(
            store_code,
            name as store_name
          ),
          item_maps!inner(
            jwnet_code,
            item_label
          ),
          actuals!inner(
            actual_qty,
            unit,
            vehicle_no,
            driver_name,
            weighing_ticket_no,
            photo_urls,
            confirmed_at
          )
        )
      `)
      .eq('status', 'PENDING')
      .limit(300)

    if (fetchError) {
      console.error('Failed to fetch pending registrations:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: '本登録データの取得に失敗しました',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!registrations || registrations.length === 0) {
      const response = CommitRegistrationsResponseSchema.parse({
        ok: true,
        sent: 0,
      })

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // JWNETゲートウェイに送信するデータを構築
    const registrationData = registrations.map(reg => {
      const plan = reg.plans
      const store = plan.stores
      const itemMap = plan.item_maps
      const actual = plan.actuals

      return {
        registration_id: reg.id,
        plan_id: plan.id,
        store_code: store.store_code,
        store_name: store.store_name,
        planned_date: plan.planned_date,
        planned_qty: plan.planned_qty,
        planned_unit: plan.unit,
        actual_qty: actual.actual_qty,
        actual_unit: actual.unit,
        jwnet_code: itemMap.jwnet_code,
        item_label: itemMap.item_label,
        vehicle_no: actual.vehicle_no,
        driver_name: actual.driver_name,
        weighing_ticket_no: actual.weighing_ticket_no,
        photo_urls: actual.photo_urls,
        confirmed_at: actual.confirmed_at,
      }
    })

    // JWNETゲートウェイに送信
    let sentCount = 0
    const results = []

    try {
      const response = await fetch(`${JWNET_GATEWAY_BASEURL}/webedi/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('JWNET_GATEWAY_TOKEN') || ''}`,
        },
        body: JSON.stringify({
          rows: registrationData
        })
      })

      if (!response.ok) {
        throw new Error(`JWNET Gateway responded with status: ${response.status}`)
      }

      const result = await response.json()
      results.push(...(result.results || []))

    } catch (error) {
      console.error('Failed to send to JWNET Gateway:', error)
      
      // エラーの場合は全ての本登録を失敗としてマーク
      for (const registration of registrations) {
        try {
          await supabase
            .from('registrations')
            .update({
              status: 'ERROR',
              last_sent_at: new Date().toISOString(),
              error_code: 'GATEWAY_ERROR',
            })
            .eq('id', registration.id)
        } catch (updateError) {
          console.error('Failed to update registration status:', updateError)
        }
      }

      return new Response(
        JSON.stringify({ 
          error: 'JWNETゲートウェイへの送信に失敗しました',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 結果を処理
    for (const result of results) {
      try {
        if (result.ok) {
          // 成功時
          await supabase
            .from('registrations')
            .update({
              manifest_no: result.manifest_no,
              status: 'REGISTERED',
              last_sent_at: new Date().toISOString(),
              error_code: null,
            })
            .eq('id', result.registration_id)
          
          sentCount++
        } else {
          // 失敗時
          await supabase
            .from('registrations')
            .update({
              status: 'ERROR',
              last_sent_at: new Date().toISOString(),
              error_code: result.error_code || 'UNKNOWN_ERROR',
            })
            .eq('id', result.registration_id)
        }
      } catch (updateError) {
        console.error('Failed to update registration:', updateError)
      }
    }

    // 監査ログに記録
    try {
      await supabase
        .from('audit_logs')
        .insert({
          org_id: registrations[0]?.org_id || '00000000-0000-0000-0000-000000000000',
          action: 'COMMIT_REGISTRATIONS',
          entity: 'registration',
          entity_id: '00000000-0000-0000-0000-000000000000',
          to_json: {
            sent_count: sentCount,
            total_count: registrations.length,
            gateway_url: JWNET_GATEWAY_BASEURL,
          },
        })
    } catch (auditError) {
      console.error('Failed to log audit:', auditError)
    }

    // レスポンス
    const response = CommitRegistrationsResponseSchema.parse({
      ok: true,
      sent: sentCount,
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

