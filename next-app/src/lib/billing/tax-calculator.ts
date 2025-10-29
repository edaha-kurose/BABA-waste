/**
 * 消費税計算ユーティリティ
 * 
 * @description
 * 端数処理方式に基づいた消費税額の計算を行います。
 * 
 * @example
 * ```typescript
 * const taxAmount = calculateTax(10000, 0.10, 'FLOOR') // 1000円（切り捨て）
 * const taxAmount = calculateTax(10003, 0.10, 'FLOOR') // 1000円（切り捨て）
 * const taxAmount = calculateTax(10003, 0.10, 'CEIL')  // 1001円（切り上げ）
 * const taxAmount = calculateTax(10005, 0.10, 'ROUND') // 1001円（四捨五入）
 * ```
 */

export type TaxRoundingMode = 'FLOOR' | 'CEIL' | 'ROUND'

/**
 * 消費税額を計算
 * 
 * @param amount - 税抜き金額
 * @param taxRate - 税率（0.10 = 10%）
 * @param roundingMode - 端数処理方式（デフォルト: FLOOR）
 * @returns 消費税額（整数）
 */
export function calculateTax(
  amount: number,
  taxRate: number,
  roundingMode: TaxRoundingMode = 'FLOOR'
): number {
  const taxAmount = amount * taxRate

  switch (roundingMode) {
    case 'FLOOR':
      return Math.floor(taxAmount)
    case 'CEIL':
      return Math.ceil(taxAmount)
    case 'ROUND':
      return Math.round(taxAmount)
    default:
      // デフォルトは切り捨て（最も安全）
      return Math.floor(taxAmount)
  }
}

/**
 * 税込み金額を計算
 * 
 * @param amount - 税抜き金額
 * @param taxRate - 税率（0.10 = 10%）
 * @param roundingMode - 端数処理方式（デフォルト: FLOOR）
 * @returns { taxAmount: 消費税額, totalAmount: 税込み金額 }
 */
export function calculateTaxIncluded(
  amount: number,
  taxRate: number,
  roundingMode: TaxRoundingMode = 'FLOOR'
): { taxAmount: number; totalAmount: number } {
  const taxAmount = calculateTax(amount, taxRate, roundingMode)
  const totalAmount = amount + taxAmount

  return { taxAmount, totalAmount }
}

/**
 * 複数明細の税額合計を計算
 * 
 * @param items - 明細配列 { amount: number }[]
 * @param taxRate - 税率（0.10 = 10%）
 * @param roundingMode - 端数処理方式（デフォルト: FLOOR）
 * @returns { subtotal: 小計, taxAmount: 消費税額, totalAmount: 税込み金額 }
 */
export function calculateTaxForItems(
  items: { amount: number }[],
  taxRate: number,
  roundingMode: TaxRoundingMode = 'FLOOR'
): { subtotal: number; taxAmount: number; totalAmount: number } {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = calculateTax(subtotal, taxRate, roundingMode)
  const totalAmount = subtotal + taxAmount

  return { subtotal, taxAmount, totalAmount }
}

/**
 * 端数処理方式の説明テキストを取得
 * 
 * @param mode - 端数処理方式
 * @returns 説明テキスト
 */
export function getTaxRoundingModeLabel(mode: TaxRoundingMode): string {
  const labels: Record<TaxRoundingMode, string> = {
    FLOOR: '切り捨て（推奨）',
    CEIL: '切り上げ',
    ROUND: '四捨五入',
  }
  return labels[mode] || '切り捨て'
}


