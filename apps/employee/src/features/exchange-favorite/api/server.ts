import "server-only";

import { randomUUID } from "node:crypto";

import {
  deleteFavorite,
  deleteSavedFilter,
  listFavoritesAndSavedFilters,
  putFavorite,
  putSavedFilter,
} from "@correcre/lib/dynamodb/exchange-favorite";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type {
  ExchangeFavoriteItem,
  ExchangeSavedFilterCriteria,
  ExchangeSavedFilterItem,
} from "@correcre/types";

type RuntimeConfig = {
  region: string;
  tableName: string;
};

function getRuntimeConfig(): RuntimeConfig {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_EXCHANGE_FAVORITE_TABLE_NAME"),
  };
}

export type ExchangeFavoriteSummary = {
  merchantId: string;
  merchandiseId: string;
  createdAt: string;
};

export type SavedFilterSummary = {
  filterId: string;
  name: string;
  criteria: ExchangeSavedFilterCriteria;
  createdAt: string;
  updatedAt: string;
};

export async function listExchangeFavoritesForEmployee(params: {
  companyId: string;
  userId: string;
}): Promise<{ favorites: ExchangeFavoriteSummary[]; savedFilters: SavedFilterSummary[] }> {
  const config = getRuntimeConfig();
  const { favorites, savedFilters } = await listFavoritesAndSavedFilters(
    config,
    params.companyId,
    params.userId,
  );

  return {
    favorites: favorites.map((item: ExchangeFavoriteItem) => ({
      merchantId: item.merchantId,
      merchandiseId: item.merchandiseId,
      createdAt: item.createdAt,
    })),
    savedFilters: savedFilters
      .map((item: ExchangeSavedFilterItem) => ({
        filterId: item.filterId,
        name: item.name,
        criteria: item.criteria,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
  };
}

export async function addExchangeFavoriteForEmployee(params: {
  companyId: string;
  userId: string;
  merchantId: string;
  merchandiseId: string;
}): Promise<ExchangeFavoriteSummary> {
  const config = getRuntimeConfig();
  const item = await putFavorite(config, params);
  return {
    merchantId: item.merchantId,
    merchandiseId: item.merchandiseId,
    createdAt: item.createdAt,
  };
}

export async function removeExchangeFavoriteForEmployee(params: {
  companyId: string;
  userId: string;
  merchantId: string;
  merchandiseId: string;
}): Promise<void> {
  const config = getRuntimeConfig();
  await deleteFavorite(config, params);
}

export async function createSavedFilterForEmployee(params: {
  companyId: string;
  userId: string;
  name: string;
  criteria: ExchangeSavedFilterCriteria;
}): Promise<SavedFilterSummary> {
  const config = getRuntimeConfig();
  const item = await putSavedFilter(config, {
    companyId: params.companyId,
    userId: params.userId,
    filterId: randomUUID(),
    name: params.name,
    criteria: params.criteria,
  });
  return {
    filterId: item.filterId,
    name: item.name,
    criteria: item.criteria,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function removeSavedFilterForEmployee(params: {
  companyId: string;
  userId: string;
  filterId: string;
}): Promise<void> {
  const config = getRuntimeConfig();
  await deleteSavedFilter(config, params);
}

export function normalizeSavedFilterCriteria(input: unknown): ExchangeSavedFilterCriteria {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: ExchangeSavedFilterCriteria = {};
  if (typeof raw.keyword === "string" && raw.keyword.trim()) out.keyword = raw.keyword.trim();
  if (typeof raw.genre === "string" && raw.genre.trim()) out.genre = raw.genre.trim();
  if (typeof raw.delivery === "string" && raw.delivery.trim()) out.delivery = raw.delivery.trim();
  if (typeof raw.area === "string" && raw.area.trim()) out.area = raw.area.trim();
  if (typeof raw.pointRange === "string" && raw.pointRange.trim()) out.pointRange = raw.pointRange.trim();
  return out;
}
