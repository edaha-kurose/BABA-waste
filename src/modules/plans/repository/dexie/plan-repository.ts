import { Repository } from '@/utils/repository'
import { Plan, PlanCreate, PlanUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexiePlanRepository implements Repository<Plan, PlanCreate, PlanUpdate> {
  private db = db

  async create(data: PlanCreate): Promise<Plan> {
    const now = new Date().toISOString()
    const plan: Plan = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.plans.add(plan)
    return plan
  }

  async findById(id: string): Promise<Plan | null> {
    return await this.db.plans.get(id) || null
  }

  async findAll(): Promise<Plan[]> {
    return await this.db.plans.toArray()
  }

  async findMany(): Promise<Plan[]> {
    return await this.db.plans.toArray()
  }

  async update(id: string, data: Partial<Omit<Plan, 'id' | 'created_at' | 'created_by'>>): Promise<Plan | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: Plan = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.plans.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: Plan = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.plans.put(updated)
    return true
  }
}
