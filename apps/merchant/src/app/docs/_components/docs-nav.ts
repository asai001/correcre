// 操作ガイドの章立て。サイドメニュー・前後ページ送り・トップの目次はすべてこの一覧から作る。
// 章を追加・並べ替えるときはここだけを直す。
export type DocsChapter = {
  href: string;
  title: string;
  // トップページの目次に出す一言説明
  summary: string;
  // 収支・精算など、管理者ユーザーにしか表示されない画面の章
  adminOnly?: boolean;
};

export type DocsChapterGroup = {
  label: string;
  chapters: DocsChapter[];
};

export const DOCS_GROUPS: DocsChapterGroup[] = [
  {
    label: "はじめる",
    chapters: [
      { href: "/docs", title: "はじめに（全体の流れ）", summary: "コレクレの仕組みと、ご利用開始までの流れ" },
      { href: "/docs/register", title: "提携企業の登録申請", summary: "申込フォームの入力から、申請完了まで" },
      { href: "/docs/first-login", title: "初回ログインとパスワード設定", summary: "招待メールの受け取りと、最初のログイン" },
      { href: "/docs/login", title: "ログイン・パスワードを忘れたとき", summary: "2回目以降のログインと、パスワードの再設定" },
    ],
  },
  {
    label: "毎日の操作",
    chapters: [
      { href: "/docs/dashboard", title: "ダッシュボードの見かた", summary: "ログイン後の画面と「やることリスト」" },
      { href: "/docs/merchandise", title: "商品・サービスを登録する", summary: "掲載する商品の登録・編集・公開／非公開" },
      { href: "/docs/exchanges", title: "交換申請に対応する", summary: "申請の承認から、発送・完了まで" },
      { href: "/docs/delivery-schedule", title: "お届け日の調整", summary: "冷蔵品などで、お届け日を相談する商品の対応" },
      { href: "/docs/reservation", title: "予約が必要なサービス", summary: "サロン・施術など、来店予約が必要な商品の対応" },
    ],
  },
  {
    label: "設定・管理",
    chapters: [
      { href: "/docs/calendar", title: "休業日カレンダー", summary: "お休みの日をお届け日の候補から外す設定" },
      { href: "/docs/settlement", title: "収支・精算（請求）", summary: "月ごとの売上の確認と、請求メールの送信", adminOnly: true },
      { href: "/docs/company-info", title: "会社情報の確認・変更", summary: "登録した会社情報・振込先の変更", adminOnly: true },
      { href: "/docs/users", title: "ユーザーを追加する", summary: "ほかの担当者をログインできるようにする", adminOnly: true },
      { href: "/docs/support", title: "運用者への問い合わせ", summary: "困ったときに運用者へ連絡する" },
    ],
  },
  {
    label: "困ったとき",
    chapters: [{ href: "/docs/faq", title: "よくある質問", summary: "つまずきやすいポイントと対処法" }],
  },
];

export const DOCS_CHAPTERS: DocsChapter[] = DOCS_GROUPS.flatMap((group) => group.chapters);

export function findChapterIndex(href: string): number {
  return DOCS_CHAPTERS.findIndex((chapter) => chapter.href === href);
}
