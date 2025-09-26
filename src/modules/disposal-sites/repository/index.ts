import { DexieDisposalSiteRepository } from './dexie/disposal-site-repository'
import { SqlDisposalSiteRepository } from './sql/disposal-site-repository'
import { getRepository } from '@/utils/repository'

// 処分場マスターリポジトリ
export const DisposalSiteRepository = getRepository(
  new DexieDisposalSiteRepository(),
  new SqlDisposalSiteRepository()
)
