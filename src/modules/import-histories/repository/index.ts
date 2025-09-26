import { DexieImportHistoryRepository } from './dexie/import-history-repository'
import { SqlImportHistoryRepository } from './sql/import-history-repository'
import { getDataBackendMode } from '@/config/env'

// データバックエンドモードに応じて適切なリポジトリを選択
const getRepository = () => {
  const mode = getDataBackendMode()
  
  switch (mode) {
    case 'dexie':
      return new DexieImportHistoryRepository()
    case 'supabase':
      return new SqlImportHistoryRepository()
    case 'dual':
    default:
      // デュアルモードの場合はDexieを優先
      return new DexieImportHistoryRepository()
  }
}

export const ImportHistoryRepository = getRepository()
export { DexieImportHistoryRepository, SqlImportHistoryRepository }
