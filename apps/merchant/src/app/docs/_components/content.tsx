// 操作ガイドの本文で使う部品。システムに不慣れな方でも追いやすいよう、
// 「手順は番号付き」「画面は必ず画像付き」「注意は色付きの枠」で書き分ける。
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCircleExclamation,
  faCircleInfo,
  faLightbulb,
  faMagnifyingGlassPlus,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import { DOCS_CHAPTERS, findChapterIndex } from "./docs-nav";
import { SCREENSHOTS, type ScreenshotName } from "./screenshots";

type Children = { children: React.ReactNode };

/** 章の見出し。章番号・タイトル・この章でわかることを出す */
export function ChapterHeader({
  href,
  lead,
  goals,
}: {
  href: string;
  lead: React.ReactNode;
  goals?: string[];
}) {
  const index = findChapterIndex(href);
  const chapter = DOCS_CHAPTERS[index];

  return (
    <header className="border-b border-slate-200 pb-8">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-teal-700">
        {index === 0 ? "はじめに" : `第 ${index} 章`}
        {chapter?.adminOnly ? <AdminOnlyBadge /> : null}
      </div>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
        {chapter?.title}
      </h1>
      <div className="mt-4 text-base leading-8 text-slate-600">{lead}</div>
      {goals && goals.length > 0 ? (
        <div className="mt-6 rounded-2xl bg-teal-50 px-5 py-4">
          <div className="text-sm font-bold text-teal-900">この章でわかること</div>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-teal-900">
            {goals.map((goal) => (
              <li key={goal} className="flex gap-2">
                <span aria-hidden>✓</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

export function AdminOnlyBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
      管理者のみ
    </span>
  );
}

/** 章の中の大見出し。id を付けるとページ内リンクの飛び先になる */
export function Section({ id, title, children }: Children & { id?: string; title: string }) {
  return (
    <section id={id} className="scroll-mt-24 pt-12">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
        <span aria-hidden className="h-7 w-1.5 rounded-full bg-teal-600" />
        {title}
      </h2>
      <div className="mt-5 space-y-5 text-[15px] leading-8 text-slate-700">{children}</div>
    </section>
  );
}

export function SubSection({ title, children }: Children & { title: string }) {
  return (
    <div className="pt-4">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

/** 番号付きの操作手順 */
export function Steps({ children }: Children) {
  return <ol className="space-y-8">{children}</ol>;
}

export function Step({ number, title, children }: { number: number; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white shadow-sm"
      >
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="pt-1 text-lg font-bold leading-8 text-slate-900">
          <span className="sr-only">手順 {number}：</span>
          {title}
        </div>
        {children ? <div className="mt-2 space-y-4">{children}</div> : null}
      </div>
    </li>
  );
}

/** 画面のスクリーンショット。クリックすると原寸で開ける */
export function Shot({
  name,
  alt,
  caption,
  maxWidth,
}: {
  name: ScreenshotName;
  alt: string;
  caption?: React.ReactNode;
  // 縦長・小さめの画面は横いっぱいに広げると見づらいため、表示幅の上限を指定する
  maxWidth?: number;
}) {
  const size = SCREENSHOTS[name];
  const src = `/docs/screenshots/${name}.webp`;

  return (
    <figure className="my-2" style={maxWidth ? { maxWidth } : undefined}>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
        aria-label={`${alt}（クリックで拡大）`}
      >
        <Image
          src={src}
          alt={alt}
          width={size.width}
          height={size.height}
          sizes="(min-width: 1024px) 860px, 100vw"
          className="h-auto w-full"
        />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
          クリックで拡大
        </span>
      </a>
      {caption ? <figcaption className="mt-2 text-sm leading-6 text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

type CalloutKind = "point" | "caution" | "tip" | "info";

const CALLOUT_STYLES: Record<CalloutKind, { label: string; icon: IconDefinition; box: string; title: string }> = {
  point: {
    label: "ポイント",
    icon: faCircleExclamation,
    box: "border-teal-200 bg-teal-50/70",
    title: "text-teal-800",
  },
  caution: {
    label: "ご注意ください",
    icon: faTriangleExclamation,
    box: "border-rose-200 bg-rose-50/70",
    title: "text-rose-700",
  },
  tip: {
    label: "ヒント",
    icon: faLightbulb,
    box: "border-amber-200 bg-amber-50/70",
    title: "text-amber-800",
  },
  info: {
    label: "補足",
    icon: faCircleInfo,
    box: "border-sky-200 bg-sky-50/70",
    title: "text-sky-800",
  },
};

export function Callout({ kind, title, children }: Children & { kind: CalloutKind; title?: string }) {
  const style = CALLOUT_STYLES[kind];

  return (
    <div className={`rounded-2xl border px-5 py-4 ${style.box}`}>
      <div className={`flex items-center gap-2 text-sm font-bold ${style.title}`}>
        <FontAwesomeIcon icon={style.icon} />
        {title ?? style.label}
      </div>
      <div className="mt-2 space-y-2 text-[15px] leading-7 text-slate-700">{children}</div>
    </div>
  );
}

/** 入力項目の説明表 */
export function FieldTable({
  rows,
}: {
  rows: { name: string; required?: boolean; description: React.ReactNode; example?: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-600">
            <th className="w-44 px-4 py-3 font-bold">項目</th>
            <th className="px-4 py-3 font-bold">入力する内容</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-slate-100 align-top">
              <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                {row.name}
                <div className="mt-1">
                  {row.required ? (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">必須</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">任意</span>
                  )}
                </div>
              </th>
              <td className="px-4 py-3 leading-7 text-slate-700">
                {row.description}
                {row.example ? <div className="mt-1 text-xs text-slate-500">例）{row.example}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 画面上のボタン・項目名を本文中で示すときの表記（「」の代わりに枠で囲む） */
export function Ui({ children }: Children) {
  return (
    <span className="mx-0.5 inline-block rounded-md border border-slate-300 bg-white px-1.5 py-px text-[0.92em] font-bold leading-6 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      {children}
    </span>
  );
}

/** 赤枠の番号（スクリーンショット内の ① ② …）を本文で参照するための丸数字 */
export function Mark({ children }: Children) {
  return (
    <span className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 align-[-2px] text-xs font-bold text-white">
      {children}
    </span>
  );
}

export function DocLink({ href, children }: Children & { href: string }) {
  return (
    <Link href={href as Route} className="font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900">
      {children}
    </Link>
  );
}

/** 交換の状態バッジ（アプリと同じ色） */
export function StatusChip({ status }: { status: "申請中" | "準備中" | "対応中" | "完了" | "却下" | "キャンセル" }) {
  const className: Record<typeof status, string> = {
    申請中: "bg-amber-100 text-amber-800",
    準備中: "bg-blue-100 text-blue-800",
    対応中: "bg-indigo-100 text-indigo-800",
    完了: "bg-emerald-100 text-emerald-800",
    却下: "bg-red-100 text-red-800",
    キャンセル: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`mx-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${className[status]}`}>
      {status}
    </span>
  );
}

/** ページ下部の「前へ／次へ」 */
export function PrevNext({ href }: { href: string }) {
  const index = findChapterIndex(href);
  const prev = index > 0 ? DOCS_CHAPTERS[index - 1] : undefined;
  const next = index >= 0 && index < DOCS_CHAPTERS.length - 1 ? DOCS_CHAPTERS[index + 1] : undefined;

  return (
    <nav aria-label="前後のページ" className="mt-16 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href as Route}
          className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-teal-300 hover:shadow"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FontAwesomeIcon icon={faArrowLeft} />
            前のページ
          </div>
          <div className="mt-1 font-bold text-slate-900 group-hover:text-teal-800">{prev.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href as Route}
          className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm transition hover:border-teal-300 hover:shadow"
        >
          <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-500">
            次のページ
            <FontAwesomeIcon icon={faArrowRight} />
          </div>
          <div className="mt-1 font-bold text-slate-900 group-hover:text-teal-800">{next.title}</div>
        </Link>
      ) : null}
    </nav>
  );
}
