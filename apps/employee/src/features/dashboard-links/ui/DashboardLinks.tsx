"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faChartLine, faGift, faUserPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import BaseTile from "@employee/components/dashboard/BaseTile";
import { updateOwnProfile } from "@employee/features/profile-edit/api/client";
import { ProfileEditDialog } from "@employee/features/profile-edit";
import type { EditableEmployeeProfile, UpdateOwnProfileInput } from "@employee/features/profile-edit";

type DashboardLinkCardBase = {
  title: string;
  description: string;
  icon: IconDefinition;
  iconColor: string;
  iconBackgroundColor: string;
};

type DashboardLinkCard =
  | (DashboardLinkCardBase & {
      kind: "link";
      href: Route | string;
      external?: boolean;
    })
  | (DashboardLinkCardBase & {
      kind: "action";
      onClick: () => void;
    });

type DashboardLinksProps = {
  initialProfile: EditableEmployeeProfile;
  showPointExchangeLink: boolean;
};

function DashboardLinkTile({ card }: { card: DashboardLinkCard }) {
  return (
    <BaseTile className="flex h-full min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 text-center transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: card.iconBackgroundColor }}>
        <FontAwesomeIcon icon={card.icon} className="text-2xl" style={{ color: card.iconColor }} />
      </div>
      <div className="text-lg font-bold text-slate-900">{card.title}</div>
      <p className="text-sm text-slate-500">{card.description}</p>
    </BaseTile>
  );
}

export default function DashboardLinks({ initialProfile, showPointExchangeLink }: DashboardLinksProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleOpenProfileDialog = () => {
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
    setError(null);
  };

  const handleUpdateProfile = async (input: UpdateOwnProfileInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const updatedProfile = await updateOwnProfile(input);
      setProfile(updatedProfile);
      setDialogOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "登録情報の更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const dashboardLinkCards: DashboardLinkCard[] = [
    ...(showPointExchangeLink
      ? ([
          {
            kind: "link",
            title: "ポイント交換",
            description: "商品・サービスと交換",
            href: "https://80462.co.jp/",
            external: true,
            icon: faGift,
            iconColor: "#D97706",
            iconBackgroundColor: "#FEF3C7",
          },
        ] satisfies DashboardLinkCard[])
      : []),
    {
      kind: "link",
      title: "過去の実績",
      description: "月別スコア履歴",
      href: "/past-performance" as Route,
      icon: faChartLine,
      iconColor: "#2563EB",
      iconBackgroundColor: "#DBEAFE",
    },
    {
      kind: "action",
      title: "登録情報変更",
      description: "プロフィール編集",
      onClick: handleOpenProfileDialog,
      icon: faUserPen,
      iconColor: "#7C3AED",
      iconBackgroundColor: "#EDE9FE",
    },
  ];

  return (
    <>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {dashboardLinkCards.map((card) =>
          card.kind === "action" ? (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className="block h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left"
            >
              <DashboardLinkTile card={card} />
            </button>
          ) : card.external ? (
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

      <ProfileEditDialog
        open={dialogOpen}
        profile={profile}
        submitting={submitting}
        error={error}
        onClose={handleCloseProfileDialog}
        onSubmit={handleUpdateProfile}
      />
    </>
  );
}
