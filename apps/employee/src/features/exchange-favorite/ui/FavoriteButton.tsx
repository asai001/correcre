"use client";

import { useState } from "react";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { addExchangeFavorite, removeExchangeFavorite } from "../api/client";

type Props = {
  merchantId: string;
  merchandiseId: string;
  isFavorite: boolean;
  onToggle?: (next: boolean) => void;
  variant?: "card" | "detail";
};

export default function FavoriteButton({
  merchantId,
  merchandiseId,
  isFavorite,
  onToggle,
  variant = "card",
}: Props) {
  const [active, setActive] = useState(isFavorite);
  const [pending, setPending] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (pending) return;

    const next = !active;
    setActive(next);
    setPending(true);

    try {
      if (next) {
        await addExchangeFavorite(merchantId, merchandiseId);
      } else {
        await removeExchangeFavorite(merchantId, merchandiseId);
      }
      onToggle?.(next);
    } catch (err) {
      setActive(!next);
      console.error("FavoriteButton toggle failed", err);
    } finally {
      setPending(false);
    }
  };

  const sizeClass =
    variant === "detail"
      ? "h-12 w-12 text-lg"
      : "h-9 w-9 text-sm";
  const stateClass = active
    ? "border-rose-300 bg-white text-rose-500"
    : "border-slate-200 bg-white text-slate-300 hover:border-rose-200 hover:text-rose-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
      className={`inline-flex items-center justify-center rounded-full border shadow-sm transition ${sizeClass} ${stateClass}`}
    >
      <FontAwesomeIcon icon={faHeart} />
    </button>
  );
}
