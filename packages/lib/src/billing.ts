// 交換手数料率の既定値（%）。提携企業に個別の設定がない場合に適用する。
export const DEFAULT_EXCHANGE_FEE_PERCENT = 5;

// 提携企業に設定された交換手数料率（%）を解決する。未設定・不正値は既定値を返す。
export function resolveExchangeFeePercent(exchangeFeePercent?: number): number {
  if (
    typeof exchangeFeePercent !== "number" ||
    !Number.isFinite(exchangeFeePercent) ||
    exchangeFeePercent < 0 ||
    exchangeFeePercent > 100
  ) {
    return DEFAULT_EXCHANGE_FEE_PERCENT;
  }
  return exchangeFeePercent;
}

// 交換手数料（円）。端数は切り捨てる。
export function calculateExchangeFeeYen(salesYen: number, exchangeFeePercent?: number): number {
  if (!Number.isFinite(salesYen) || salesYen <= 0) {
    return 0;
  }
  return Math.floor((salesYen * resolveExchangeFeePercent(exchangeFeePercent)) / 100);
}

// 提携企業が運用者へ請求する金額（円）＝ 売上 − 交換手数料。
// 運用者側の「提携企業への支払額」も同じ値になる。
export function calculateMerchantInvoiceYen(salesYen: number, exchangeFeePercent?: number): number {
  if (!Number.isFinite(salesYen) || salesYen <= 0) {
    return 0;
  }
  return salesYen - calculateExchangeFeeYen(salesYen, exchangeFeePercent);
}
