// 予約が必要な商品（サロン等）で、予約サービスごとに変わる案内文とラベル。
// merchant の商品フォーム・employee の予約案内画面・承認メールで同じ文言を使うため一か所にまとめる。
// DB もネットワークも触らない純関数なので、サーバー・クライアントの双方から使える。
import type { MerchandiseReservation, ReservationSystem } from "@correcre/types";

export const RESERVATION_SYSTEM_LABELS: Record<ReservationSystem, string> = {
  HOT_PEPPER_BEAUTY: "ホットペッパービューティー",
  OTHER: "その他（自社サイト・他の予約サービス・電話など）",
};

// 予約サービス導入前に登録された商品は reservationSystem を持たないため、従来どおりの案内（OTHER）にする
export function resolveReservationSystem(
  reservation: Pick<MerchandiseReservation, "reservationSystem"> | undefined,
): ReservationSystem {
  return reservation?.reservationSystem ?? "OTHER";
}

export function isReservationSystem(value: unknown): value is ReservationSystem {
  return value === "HOT_PEPPER_BEAUTY" || value === "OTHER";
}

// 予約ページを開いた後の進め方。トップページに遷移させるホットペッパービューティーだけ、
// 対象メニューを自分で選んでもらう必要があるので案内を足す。
export function getReservationPageGuidance(system: ReservationSystem): string | undefined {
  if (system === "HOT_PEPPER_BEAUTY") {
    return "予約ページ（サロンのページ）が開いたら、対象のメニューまたはクーポンを選んでご予約ください。";
  }
  return undefined;
}

// 店舗が交換申請と予約を照合するための、交換番号の伝え方
export function getReservationCodeGuidance(system: ReservationSystem): string {
  if (system === "HOT_PEPPER_BEAUTY") {
    return "ご予約の際は、予約画面の「サロンからの質問」欄に上記の交換番号を必ずご入力ください。入力欄がない場合は、ご来店時に交換番号をお伝えください。";
  }
  return "ご予約の際は、予約サイトの備考欄への記入、またはお電話・ご来店時に、上記の交換番号を必ずお伝えください。";
}

// ホットペッパービューティーのサロンページは https://beauty.hotpepper.jp/slnH000000000/ の形。
// メニュー・クーポンの個別ページや予約画面の URL は、申請者の環境によって予約エラーになるため、
// フォームで注意を出す（保存は止めない。URL 体系が変わっても入力できるようにするため）。
export function looksLikeHotPepperNonTopUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }

  if (!parsed.hostname.endsWith("hotpepper.jp")) {
    return false;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  return segments.length > 1 || !/^sln/i.test(segments[0]) || parsed.search !== "";
}
