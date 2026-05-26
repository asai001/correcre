"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, Snackbar } from "@mui/material";
import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faLocationDot,
  faSearch,
  faSliders,
  faTag,
  faTrashCan,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { MerchandiseCard, type PublicMerchandiseSummary } from "@correcre/merchandise-public";

import {
  createSavedFilter as createSavedFilterApi,
  deleteSavedFilter as deleteSavedFilterApi,
  FavoriteButton,
  type FavoriteSummary,
  type SavedFilter,
} from "@employee/features/exchange-favorite";

import ExchangePageHeader from "./ExchangePageHeader";

type Props = {
  items: PublicMerchandiseSummary[];
  currentPointBalance: number;
  userName: string;
  initialFavorites: FavoriteSummary[];
  initialSavedFilters: SavedFilter[];
};

type SortKey = "popular" | "newest" | "lowestPoint";

type PointRange = { min: number; max?: number };

const PAGE_SIZE = 13;

const POINT_RANGES: { value: string; label: string; range: PointRange }[] = [
  { value: "any", label: "指定なし", range: { min: 0 } },
  { value: "lt500", label: "〜500pt", range: { min: 0, max: 500 } },
  { value: "500to1000", label: "500〜1,000pt", range: { min: 500, max: 1000 } },
  { value: "1000to2000", label: "1,000〜2,000pt", range: { min: 1000, max: 2000 } },
  { value: "2000to5000", label: "2,000〜5,000pt", range: { min: 2000, max: 5000 } },
  { value: "gt5000", label: "5,000pt〜", range: { min: 5000 } },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "人気順" },
  { value: "newest", label: "新着順" },
  { value: "lowestPoint", label: "ポイントが低い順" },
];

function buildDetailHref(item: PublicMerchandiseSummary): Route {
  const search = new URLSearchParams({ merchantId: item.merchantId }).toString();
  return `/exchange/${encodeURIComponent(item.merchandiseId)}?${search}` as Route;
}

function favoriteKey(merchantId: string, merchandiseId: string) {
  return `${merchantId}/${merchandiseId}`;
}

function uniqueValues<T>(values: (T | undefined | null)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== undefined && v !== null && v !== "")));
}

function PickupCarouselSlide({ item }: { item: PublicMerchandiseSummary }) {
  const merchandiseName = item.merchandiseName || item.heading || "商品・サービス";
  const genreLabel = item.genre === "その他" ? item.genreOther || "その他" : item.genre;
  const areaSummary = item.serviceArea.trim() || "全国";
  const deliveryMethodSummary = item.deliveryMethods.length > 0 ? item.deliveryMethods.join("、") : "—";

  return (
    <Link href={buildDetailHref(item)} className="block h-full p-5 transition hover:bg-slate-50">
      <p className="text-[11px] text-slate-400">今週の注目</p>
      <h3 className="mt-3 line-clamp-1 text-xl font-bold leading-snug text-slate-900">{merchandiseName}</h3>
      <p className="mt-2 line-clamp-1 text-xs text-slate-500">{item.merchantName || "提供会社"}</p>
      <ul className="mt-[3.5rem] flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
        <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
          <FontAwesomeIcon icon={faTruck} className="text-[10px] text-slate-400" />
          <span className="line-clamp-1">{deliveryMethodSummary}</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
          <FontAwesomeIcon icon={faLocationDot} className="text-[10px] text-slate-400" />
          <span className="line-clamp-1">{areaSummary}</span>
        </li>
        <li className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
          <FontAwesomeIcon icon={faTag} className="text-[10px] text-slate-400" />
          <span className="line-clamp-1">{genreLabel}</span>
        </li>
      </ul>
    </Link>
  );
}

function PickupBanner({
  items,
  onShowFeatured,
  onShowNewest,
}: {
  items: PublicMerchandiseSummary[];
  onShowFeatured: () => void;
  onShowNewest: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = items.length;

  useEffect(() => {
    if (total <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [total]);

  useEffect(() => {
    if (activeIndex >= total) setActiveIndex(0);
  }, [activeIndex, total]);

  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + total) % total);
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % total);

  return (
    <section className="rounded-[4px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        <div
          className="relative col-span-1 flex flex-col justify-center overflow-hidden rounded-[4px] p-6 md:col-span-7 md:p-8"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.6) 100%), url('/pickup-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">がんばったジブンにご褒美を</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-700">
            いつもがんばっているあなたへ。ほっとひと息つけるご褒美を見つけて、少しだけ気分が軽くなる時間をお届けします。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onShowFeatured}
              className="inline-flex items-center justify-center rounded-[2px] bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              注目商品を見る
            </button>
            <button
              type="button"
              onClick={onShowNewest}
              className="inline-flex items-center justify-center rounded-[2px] border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              新着を確認
            </button>
          </div>
        </div>

        <div className="col-span-1 flex flex-col self-center rounded-[4px] border border-slate-200 bg-white md:col-span-5">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {items.map((item) => (
                <div key={`${item.merchantId}/${item.merchandiseId}`} className="w-full shrink-0">
                  <PickupCarouselSlide item={item} />
                </div>
              ))}
            </div>
          </div>

          {total > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="前の注目商品"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
              </button>
              <div className="flex items-center gap-1.5">
                {items.map((item, idx) => (
                  <button
                    key={`${item.merchantId}/${item.merchandiseId}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`${idx + 1}件目を表示`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeIndex ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleNext}
                aria-label="次の注目商品"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type FilterState = {
  keyword: string;
  genre: string;
  delivery: string;
  area: string;
  pointRange: string;
};

const INITIAL_FILTER: FilterState = {
  keyword: "",
  genre: "",
  delivery: "",
  area: "",
  pointRange: "any",
};

function FilterBox({
  value,
  onChange,
  onApply,
  onReset,
  onSave,
  onLoadSaved,
  onDeleteSaved,
  savedFilters,
  saving,
  genres,
  deliveries,
  areas,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onSave: (name: string) => Promise<void>;
  onLoadSaved: (filter: SavedFilter) => void;
  onDeleteSaved: (filterId: string) => Promise<void>;
  savedFilters: SavedFilter[];
  saving: boolean;
  genres: string[];
  deliveries: string[];
  areas: string[];
}) {
  const [open, setOpen] = useState(true);
  const [savedOpen, setSavedOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const update = <K extends keyof FilterState>(key: K, next: FilterState[K]) => {
    onChange({ ...value, [key]: next });
  };

  const handleSave = async () => {
    const name = draftName.trim();
    if (!name) return;
    await onSave(name);
    setDraftName("");
  };

  return (
    <section className="rounded-[4px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
        >
          <FontAwesomeIcon icon={faSliders} className="text-slate-500" />
          絞り込み
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`text-xs text-slate-500 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          />
        </button>
        <button
          type="button"
          onClick={() => setSavedOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          保存条件 {savedFilters.length}件
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${savedOpen ? "rotate-180" : "rotate-0"}`} />
        </button>
      </div>

      {savedOpen ? (
        <div className="border-t border-slate-200 px-5 py-4">
          {savedFilters.length === 0 ? (
            <p className="text-xs text-slate-500">保存された条件はまだありません。</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {savedFilters.map((filter) => (
                <li
                  key={filter.filterId}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1 py-1 text-xs font-semibold text-slate-700"
                >
                  <button type="button" onClick={() => onLoadSaved(filter)} className="hover:text-slate-900">
                    {filter.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSaved(filter.filterId)}
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    aria-label="保存条件を削除"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {open ? (
        <div className="space-y-3 border-t border-slate-200 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={value.keyword}
              onChange={(event) => update("keyword", event.target.value)}
              placeholder="キーワード検索（商品名・会社名）"
              className="h-10 rounded-[2px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <select
              value={value.genre}
              onChange={(event) => update("genre", event.target.value)}
              className="h-10 rounded-[2px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">ジャンル（指定なし）</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={value.delivery}
              onChange={(event) => update("delivery", event.target.value)}
              className="h-10 rounded-[2px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">提供方法（指定なし）</option>
              {deliveries.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={value.area}
              onChange={(event) => update("area", event.target.value)}
              className="h-10 rounded-[2px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">対応エリア（指定なし）</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={value.pointRange}
              onChange={(event) => update("pointRange", event.target.value)}
              className="h-10 rounded-[2px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 md:col-span-2"
            >
              {POINT_RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  ポイント帯：{option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-[2px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faSearch} className="text-xs" />
              この条件で検索
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center rounded-[2px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              条件をリセット
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="保存名（例: 食品・全国）"
                className="h-9 rounded-[2px] border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draftName.trim()}
                className="inline-flex items-center rounded-[2px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "保存中…" : "条件を保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SortAndCount({
  sort,
  onSort,
  total,
  page,
  totalPages,
  onlyFavorites,
  onToggleOnlyFavorites,
}: {
  sort: SortKey;
  onSort: (next: SortKey) => void;
  total: number;
  page: number;
  totalPages: number;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
}) {
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {SORT_OPTIONS.map((option) => {
          const active = option.value === sort;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSort(option.value)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleOnlyFavorites}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
            onlyFavorites ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          お気に入りのみ
        </button>
      </div>
      <div className="text-xs text-slate-500">{total === 0 ? "0件" : `${total}件中 ${startIdx}-${endIdx}件 / ${totalPages}ページ`}</div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (next: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const range = 2;
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= range) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-[2px] border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        前へ
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-[36px] rounded-[2px] border px-3 py-1.5 text-sm font-semibold transition ${
              p === page ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-[2px] border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        次へ
      </button>
    </nav>
  );
}

function getGenreLabel(item: PublicMerchandiseSummary): string {
  return item.genre === "その他" ? item.genreOther || "その他" : item.genre;
}

function applyFilters(items: PublicMerchandiseSummary[], filter: FilterState): PublicMerchandiseSummary[] {
  const range = POINT_RANGES.find((option) => option.value === filter.pointRange)?.range;
  const keyword = filter.keyword.trim().toLowerCase();

  return items.filter((item) => {
    if (filter.genre && getGenreLabel(item) !== filter.genre) {
      return false;
    }
    if (filter.delivery && !item.deliveryMethods.includes(filter.delivery as never)) {
      return false;
    }
    if (filter.area && !item.serviceArea.includes(filter.area)) {
      return false;
    }
    if (range) {
      if (item.requiredPoint < range.min) return false;
      if (range.max !== undefined && item.requiredPoint >= range.max) return false;
    }
    if (keyword) {
      const haystack = `${item.merchandiseName} ${item.heading} ${item.merchantName} ${item.serviceDescription}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

function applySort(items: PublicMerchandiseSummary[], sort: SortKey): PublicMerchandiseSummary[] {
  const sorted = [...items];
  switch (sort) {
    case "newest":
      sorted.sort((a, b) => {
        const ad = a.publishDate ?? "";
        const bd = b.publishDate ?? "";
        if (ad !== bd) return ad < bd ? 1 : -1;
        return a.merchandiseId < b.merchandiseId ? 1 : -1;
      });
      return sorted;
    case "lowestPoint":
      sorted.sort((a, b) => a.requiredPoint - b.requiredPoint);
      return sorted;
    case "popular":
    default:
      sorted.sort((a, b) => {
        const aFav = a.favoriteCount ?? 0;
        const bFav = b.favoriteCount ?? 0;
        if (aFav !== bFav) return bFav - aFav;
        const ad = a.publishDate ?? "";
        const bd = b.publishDate ?? "";
        if (ad !== bd) return ad < bd ? 1 : -1;
        return a.merchandiseId < b.merchandiseId ? 1 : -1;
      });
      return sorted;
  }
}

export default function ExchangeList({ items, currentPointBalance, userName, initialFavorites, initialSavedFilters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterDraft, setFilterDraft] = useState<FilterState>(INITIAL_FILTER);
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(initialFavorites.map((f) => favoriteKey(f.merchantId, f.merchandiseId))),
  );
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(initialSavedFilters);
  const [savingFilter, setSavingFilter] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const listSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (searchParams.get("notice") !== "exchange-requested") return;

    setToastMessage("交換を申請しました。");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("notice");
    const nextSearch = params.toString();
    router.replace((nextSearch ? `/exchange?${nextSearch}` : "/exchange") as Route);
  }, [searchParams, router]);

  const handleShowFeatured = () => {
    setSort("popular");
    setPage(1);
    listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShowNewest = () => {
    setSort("newest");
    setPage(1);
    listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const genres = useMemo(
    () => uniqueValues(items.map((item) => (item.genre === "その他" ? item.genreOther || "その他" : item.genre))),
    [items],
  );
  const deliveries = useMemo(() => uniqueValues(items.flatMap((item) => item.deliveryMethods)), [items]);
  const areas = useMemo(() => uniqueValues(items.map((item) => item.serviceArea?.trim())), [items]);

  const pickupItems = useMemo(() => {
    const tagged = items.filter((item) => item.tags && item.tags.length > 0);
    const picks = tagged.length > 0 ? tagged : items;
    return picks.slice(0, 5);
  }, [items]);

  const filtered = useMemo(() => {
    let next = applyFilters(items, filter);
    if (onlyFavorites) {
      next = next.filter((item) => favorites.has(favoriteKey(item.merchantId, item.merchandiseId)));
    }
    return next;
  }, [items, filter, onlyFavorites, favorites]);

  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleApply = () => {
    setFilter(filterDraft);
    setPage(1);
  };

  const handleReset = () => {
    setFilterDraft(INITIAL_FILTER);
    setFilter(INITIAL_FILTER);
    setPage(1);
  };

  const handleSaveFilter = async (name: string) => {
    setSavingFilter(true);
    try {
      const created = await createSavedFilterApi({ name, criteria: filterDraft });
      setSavedFilters((prev) => [created, ...prev]);
    } catch (err) {
      console.error("createSavedFilter failed", err);
    } finally {
      setSavingFilter(false);
    }
  };

  const handleLoadSavedFilter = (saved: SavedFilter) => {
    const next: FilterState = {
      keyword: saved.criteria.keyword ?? "",
      genre: saved.criteria.genre ?? "",
      delivery: saved.criteria.delivery ?? "",
      area: saved.criteria.area ?? "",
      pointRange: saved.criteria.pointRange ?? "any",
    };
    setFilterDraft(next);
    setFilter(next);
    setPage(1);
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    const previous = savedFilters;
    setSavedFilters((prev) => prev.filter((f) => f.filterId !== filterId));
    try {
      await deleteSavedFilterApi(filterId);
    } catch (err) {
      console.error("deleteSavedFilter failed", err);
      setSavedFilters(previous);
    }
  };

  const handleFavoriteToggle = (merchantId: string, merchandiseId: string) => (next: boolean) => {
    setFavorites((prev) => {
      const updated = new Set(prev);
      const key = favoriteKey(merchantId, merchandiseId);
      if (next) updated.add(key);
      else updated.delete(key);
      return updated;
    });
  };

  return (
    <div className="-mt-px pb-12">
      <ExchangePageHeader currentPointBalance={currentPointBalance} userName={userName} />

      <div className="container mx-auto space-y-6 px-6 pt-8">
        {pickupItems.length > 0 ? (
          <PickupBanner items={pickupItems} onShowFeatured={handleShowFeatured} onShowNewest={handleShowNewest} />
        ) : null}

        <FilterBox
          value={filterDraft}
          onChange={setFilterDraft}
          onApply={handleApply}
          onReset={handleReset}
          onSave={handleSaveFilter}
          onLoadSaved={handleLoadSavedFilter}
          onDeleteSaved={handleDeleteSavedFilter}
          savedFilters={savedFilters}
          saving={savingFilter}
          genres={genres}
          deliveries={deliveries}
          areas={areas}
        />

        <div ref={listSectionRef} className="scroll-mt-6">
          <SortAndCount
            sort={sort}
            onSort={(next) => {
              setSort(next);
              setPage(1);
            }}
            total={sorted.length}
            page={safePage}
            totalPages={totalPages}
            onlyFavorites={onlyFavorites}
            onToggleOnlyFavorites={() => {
              setOnlyFavorites((prev) => !prev);
              setPage(1);
            }}
          />
        </div>

        {pageItems.length === 0 ? (
          <div className="rounded-[4px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            {onlyFavorites ? "お気に入りの商品はまだありません。" : "条件に合致する商品はありません。"}
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((item) => {
              const key = favoriteKey(item.merchantId, item.merchandiseId);
              const isFavorite = favorites.has(key);
              return (
                <li key={key} className="h-full">
                  <Link href={buildDetailHref(item)} className="group block h-full">
                    <MerchandiseCard
                      item={item}
                      favoriteSlot={
                        <FavoriteButton
                          merchantId={item.merchantId}
                          merchandiseId={item.merchandiseId}
                          isFavorite={isFavorite}
                          onToggle={handleFavoriteToggle(item.merchantId, item.merchandiseId)}
                        />
                      }
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>

      <Snackbar
        open={toastMessage !== null}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: { xs: 24, sm: 32 } }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToastMessage(null)}
          sx={{
            minWidth: { xs: 280, sm: 420 },
            px: 3,
            py: 1.75,
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: "12px",
            boxShadow: "0 12px 32px -12px rgba(15,23,42,0.35)",
            "& .MuiAlert-icon": { fontSize: "1.5rem" },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
