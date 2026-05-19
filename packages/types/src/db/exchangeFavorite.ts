/**
 * `correcre-exchange-favorite-<stage>` テーブル。
 *
 * - お気に入り商品: SK = `FAVORITE#<merchantId>#<merchandiseId>`
 * - 保存検索条件: SK = `SAVED_FILTER#<filterId>`
 *
 * 1ユーザー（companyId × userId）あたり高々数十件想定のため、Query は PK のみで取得する。
 */

export type ExchangeFavoriteRecordType = "FAVORITE" | "SAVED_FILTER";

export type ExchangeFavoriteItem = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `FAVORITE#${string}#${string}`;
  recordType: "FAVORITE";
  companyId: string;
  userId: string;
  merchantId: string;
  merchandiseId: string;
  createdAt: string;
};

export type ExchangeSavedFilterCriteria = {
  keyword?: string;
  genre?: string;
  delivery?: string;
  area?: string;
  pointRange?: string;
};

export type ExchangeSavedFilterItem = {
  pk: `COMPANY#${string}#USER#${string}`;
  sk: `SAVED_FILTER#${string}`;
  recordType: "SAVED_FILTER";
  companyId: string;
  userId: string;
  filterId: string;
  name: string;
  criteria: ExchangeSavedFilterCriteria;
  createdAt: string;
  updatedAt: string;
};

export type ExchangeFavoriteRecord = ExchangeFavoriteItem | ExchangeSavedFilterItem;
