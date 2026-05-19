import type { ExchangeSavedFilterCriteria } from "@correcre/types";

export type FavoriteSummary = {
  merchantId: string;
  merchandiseId: string;
  createdAt: string;
};

export type SavedFilter = {
  filterId: string;
  name: string;
  criteria: ExchangeSavedFilterCriteria;
  createdAt: string;
  updatedAt: string;
};

export type FavoritesResponse = {
  favorites: FavoriteSummary[];
  savedFilters: SavedFilter[];
};

export type CreateSavedFilterRequest = {
  name: string;
  criteria: ExchangeSavedFilterCriteria;
};
