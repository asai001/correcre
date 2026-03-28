import Link from "next/link";
import type { Route } from "next";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faChartLine, faGift, faUserPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import BaseTile from "@employee/components/dashboard/BaseTile";

type DashboardLinkCard = {
  title: string;
  description: string;
  href: Route | string;
  external?: boolean;
  icon: IconDefinition;
  iconColor: string;
  iconBackgroundColor: string;
};

const dashboardLinkCards: DashboardLinkCard[] = [
  {
    title: "ポイント交換",
    description: "商品・サービスと交換",
    href: "https://80462.co.jp/",
    external: true,
    icon: faGift,
    iconColor: "#D97706",
    iconBackgroundColor: "#FEF3C7",
  },
  {
    title: "過去の実績",
    description: "月別スコア履歴",
    href: "/past-performance" as Route,
    icon: faChartLine,
    iconColor: "#2563EB",
    iconBackgroundColor: "#DBEAFE",
  },
  {
    title: "登録情報変更",
    description: "プロフィール編集",
    href: "#",
    external: true,
    icon: faUserPen,
    iconColor: "#7C3AED",
    iconBackgroundColor: "#EDE9FE",
  },
];

function DashboardLinkTile({ card }: { card: DashboardLinkCard }) {
  return (
    <BaseTile className="flex h-full min-h-[168px] flex-col items-center justify-center gap-3 text-center transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: card.iconBackgroundColor }}>
        <FontAwesomeIcon icon={card.icon} className="text-2xl" style={{ color: card.iconColor }} />
      </div>
      <div className="text-lg font-bold text-slate-900">{card.title}</div>
      <p className="text-sm text-slate-500">{card.description}</p>
    </BaseTile>
  );
}

export default function DashboardLinks() {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {dashboardLinkCards.map((card) =>
        card.external ? (
          <a
            key={card.title}
            href={card.href}
            className="block h-full"
            target={card.href.startsWith("http") ? "_blank" : undefined}
            rel={card.href.startsWith("http") ? "noreferrer" : undefined}
          >
            <DashboardLinkTile card={card} />
          </a>
        ) : (
          <Link key={card.title} href={card.href as Route} className="block h-full">
            <DashboardLinkTile card={card} />
          </Link>
        )
      )}
    </section>
  );
}
