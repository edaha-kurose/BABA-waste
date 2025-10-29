/**
 * マルチテナント対応 Prisma ユーティリティ
 * 
 * 目的:
 * - 全てのクエリで org_id フィルタを強制
 * - RLS との二重防御でテナント分離を保証
 * - グローバルルール準拠（Prisma必須）
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * テナント分離されたデータ取得（複数）
 */
export async function getTenantData<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  options?: any
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
      ...options?.where,
    },
    ...options,
  });
}

/**
 * テナント分離されたデータ取得（単一）
 */
export async function getTenantDataSingle<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  options?: any
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.findFirst({
    where: {
      org_id: orgId,
      deleted_at: null,
      ...options?.where,
    },
    ...options,
  });
}

/**
 * テナント分離された件数取得
 */
export async function getTenantCount<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  options?: any
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.count({
    where: {
      org_id: orgId,
      deleted_at: null,
      ...options?.where,
    },
    ...options,
  });
}

/**
 * テナント分離されたデータ作成
 */
export async function createTenantData<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  userId: string,
  data: any
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.create({
    data: {
      ...data,
      org_id: orgId,
      created_by: userId,
      updated_by: userId,
    },
  });
}

/**
 * テナント分離されたデータ更新
 */
export async function updateTenantData<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  userId: string,
  id: string,
  data: any
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.updateMany({
    where: {
      id,
      org_id: orgId,
      deleted_at: null,
    },
    data: {
      ...data,
      updated_by: userId,
      updated_at: new Date(),
    },
  });
}

/**
 * テナント分離されたデータ削除（論理削除）
 */
export async function deleteTenantData<T extends keyof typeof prisma>(
  model: T,
  orgId: string,
  userId: string,
  id: string
) {
  const modelClient = prisma[model] as any;
  
  return modelClient.updateMany({
    where: {
      id,
      org_id: orgId,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
      updated_by: userId,
      updated_at: new Date(),
    },
  });
}

/**
 * 使用例:
 * 
 * // 取得（複数）
 * const stores = await getTenantData('stores', authUser.org_id, {
 *   orderBy: { created_at: 'desc' },
 *   take: 10,
 * });
 * 
 * // 取得（単一）
 * const store = await getTenantDataSingle('stores', authUser.org_id, {
 *   where: { store_code: 'STORE001' },
 * });
 * 
 * // 件数
 * const count = await getTenantCount('stores', authUser.org_id);
 * 
 * // 作成
 * const newStore = await createTenantData('stores', authUser.org_id, authUser.id, {
 *   name: '新店舗',
 *   store_code: 'STORE999',
 * });
 * 
 * // 更新
 * await updateTenantData('stores', authUser.org_id, authUser.id, storeId, {
 *   name: '更新後の店舗名',
 * });
 * 
 * // 削除
 * await deleteTenantData('stores', authUser.org_id, authUser.id, storeId);
 */

