// ============================================================================
// 予約データ送信 Edge Function
// 作成日: 2025-09-16
// 目的: 予約データをJWNETに送信する
// ============================================================================

import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { SendReservationsResponseSchema } from "@contracts/v0/schema"

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

    // 送信待ちの予約データを取得
    const { data: reservations, error: fetchError } = await supabase
      .from('v_reservations_pending')
      .select('*')
      .limit(300)

    if (fetchError) {
      console.error('Failed to fetch pending reservations:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: '予約データの取得に失敗しました',
          details: fetchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!reservations || reservations.length === 0) {
      const response = SendReservationsResponseSchema.parse({
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

    // JWNETゲートウェイに送信
    let sentCount = 0
    const results = []

    try {
      const response = await fetch(`${JWNET_GATEWAY_BASEURL}/webedi/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('JWNET_GATEWAY_TOKEN') || ''}`,
        },
        body: JSON.stringify({
          rows: reservations.map(r => ({
            reservation_id: r.id,
            store_code: r.store_code,
            store_name: r.store_name,
            planned_date: r.planned_date,
            planned_qty: r.planned_qty,
            unit: r.unit,
            jwnet_code: r.jwnet_code,
            payload_hash: r.payload_hash,
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`JWNET Gateway responded with status: ${response.status}`)
      }

      const result = await response.json()
      results.push(...(result.results || []))

    } catch (error) {
      console.error('Failed to send to JWNET Gateway:', error)
      
      // エラーの場合は全ての予約を失敗としてマーク
      for (const reservation of reservations) {
        try {
          await supabase
            .from('reservations')
            .update({
              status: 'FAILED',
              last_sent_at: new Date().toISOString(),
              error_code: 'GATEWAY_ERROR',
            })
            .eq('id', reservation.id)
        } catch (updateError) {
          console.error('Failed to update reservation status:', updateError)
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
            .from('reservations')
            .update({
              jwnet_temp_id: result.jwnet_temp_id,
              status: 'RESERVED',
              last_sent_at: new Date().toISOString(),
              error_code: null,
            })
            .eq('id', result.reservation_id)
          
          sentCount++
        } else {
          // 失敗時
          await supabase
            .from('reservations')
            .update({
              status: 'FAILED',
              last_sent_at: new Date().toISOString(),
              error_code: result.error_code || 'UNKNOWN_ERROR',
            })
            .eq('id', result.reservation_id)
        }
      } catch (updateError) {
        console.error('Failed to update reservation:', updateError)
      }
    }

    // 監査ログに記録
    try {
      await supabase
        .from('audit_logs')
        .insert({
          org_id: reservations[0]?.org_id || '00000000-0000-0000-0000-000000000000',
          action: 'SEND_RESERVATIONS',
          entity: 'reservation',
          entity_id: '00000000-0000-0000-0000-000000000000',
          to_json: {
            sent_count: sentCount,
            total_count: reservations.length,
            gateway_url: JWNET_GATEWAY_BASEURL,
          },
        })
    } catch (auditError) {
      console.error('Failed to log audit:', auditError)
    }

    // レスポンス
    const response = SendReservationsResponseSchema.parse({
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

