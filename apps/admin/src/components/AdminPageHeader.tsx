"use client";

import Link from "next/link";
import type { Route } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faUserShield } from "@fortawesome/free-solid-svg-icons";

type AdminPageHeaderProps = {
  title: string;
  adminName: string;
  backHref?: Route;
  subtitle?: string;
};

export default function AdminPageHeader({
  title,
  adminName,
  backHref = "/dashboard",
  subtitle = "コレクレ管理システム",
}: AdminPageHeaderProps) {
  return (
    <section className="relative left-1/2 -mx-[50vw] w-screen bg-[linear-gradient(90deg,#6179e7_0%,#7b4ca5_100%)] text-white">
      <div className="container mx-auto flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            aria-label="ダッシュボードへ戻る"
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-[2.2rem]">{title}</h1>
            <p className="mt-1 text-sm font-semibold text-white/85 sm:text-[1.05rem]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <div className="text-xs font-semibold tracking-[0.2em] text-white/70">管理者</div>
            <div className="mt-1 text-lg font-bold sm:text-[1.7rem]">{adminName}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/18 text-lg shadow-lg shadow-violet-900/15">
            <FontAwesomeIcon icon={faUserShield} />
          </div>
        </div>
      </div>
    </section>
  );
}
