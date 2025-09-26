import { DexieRepository } from '@/utils/repository'
import { DisposalSite, DisposalSiteCreate, DisposalSiteUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieDisposalSiteRepository extends DexieRepository<DisposalSite, DisposalSiteCreate, DisposalSiteUpdate> {
  constructor() {
    super(db.disposalSites)
  }

  // 収集業者IDで処分場を検索
  async findByCollectorId(collectorId: string): Promise<DisposalSite[]> {
    await this.ensureDatabaseInitialized()
    return await this.db
      .where('collector_id')
      .equals(collectorId)
      .and(record => !record.deleted_at)
      .toArray()
  }

  // アクティブな処分場のみを取得
  async findActive(): Promise<DisposalSite[]> {
    await this.ensureDatabaseInitialized()
    return await this.db
      .where('is_active')
      .equals(true)
      .and(record => !record.deleted_at)
      .toArray()
  }

  // 収集業者IDでアクティブな処分場を検索
  async findActiveByCollectorId(collectorId: string): Promise<DisposalSite[]> {
    await this.ensureDatabaseInitialized()
    return await this.db
      .where(['collector_id', 'is_active'])
      .equals([collectorId, true])
      .and(record => !record.deleted_at)
      .toArray()
  }
}
