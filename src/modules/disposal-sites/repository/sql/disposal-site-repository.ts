import { SqlRepository } from '@/utils/repository'
import { DisposalSite, DisposalSiteCreate, DisposalSiteUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlDisposalSiteRepository extends SqlRepository<DisposalSite, DisposalSiteCreate, DisposalSiteUpdate> {
  constructor() {
    super(supabase, 'disposal_sites')
  }

  // 収集業者IDで処分場を検索
  async findByCollectorId(collectorId: string): Promise<DisposalSite[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('collector_id', collectorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch disposal sites: ${error.message}`)
    }

    return data || []
  }

  // アクティブな処分場のみを取得
  async findActive(): Promise<DisposalSite[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch active disposal sites: ${error.message}`)
    }

    return data || []
  }

  // 収集業者IDでアクティブな処分場を検索
  async findActiveByCollectorId(collectorId: string): Promise<DisposalSite[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('collector_id', collectorId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch active disposal sites by collector: ${error.message}`)
    }

    return data || []
  }
}
