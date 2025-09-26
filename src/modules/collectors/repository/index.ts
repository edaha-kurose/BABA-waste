// Collectorは統合されたUserテーブルを使用
// roleがCOLLECTORのユーザーを収集業者として扱う
import { UserRepository } from '@/modules/users/repository'
import { Collector, CollectorCreate, CollectorUpdate } from '@contracts/v0/schema'

export const CollectorRepository: typeof UserRepository = UserRepository

// 小文字のエクスポートも追加（後方互換性のため）
export const collectorRepository = CollectorRepository
