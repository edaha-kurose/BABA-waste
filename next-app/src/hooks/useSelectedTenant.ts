import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SelectedTenantState {
  selectedTenantId: string | null
  setSelectedTenantId: (id: string | null) => void
}

/**
 * システム管理会社用：選択中のテナントID管理
 */
export const useSelectedTenant = create<SelectedTenantState>()(
  persist(
    (set) => ({
      selectedTenantId: null,
      setSelectedTenantId: (id) => set({ selectedTenantId: id }),
    }),
    {
      name: 'selected-tenant-storage',
    }
  )
)


