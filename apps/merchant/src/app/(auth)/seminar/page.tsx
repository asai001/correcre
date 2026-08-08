import Image from "next/image";
import type { Metadata } from "next";

import { SeminarRegistrationForm } from "@merchant/features/seminar";
import { getSeminarPageInfo } from "@merchant/features/seminar/api/server";

// 開催情報・Zoom 情報は環境変数で運用するため、ビルド時ではなくリクエスト時に読む。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "コレクレ 提携企業向け説明会 お申し込み",
  description: "コレクレの提携企業向けオンライン説明会のお申し込みフォームです。",
};

export default function SeminarPage() {
  const seminar = getSeminarPageInfo();

  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 mb-16 w-9/10 max-w-[560px] lg:mb-20">
        <SeminarRegistrationForm seminar={seminar} />
      </div>
      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/favicon.svg"
        alt=""
        width={110}
        height={110}
      />
    </>
  );
}
