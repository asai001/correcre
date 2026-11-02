// 操作ガイドの章立て。サイドメニュー・前後ページ送り・トップの目次はすべてこの一覧から作る。
// 章を追加・並べ替えるときはここだけを直す。
export type DocsChapter = {
  href: string;
  title: string;
  // トップページの目次に出す一言説明
  summary: string;
  // 章タイトル横に出すバッジ。ポイント交換が使える会社だけに表示される画面の章に付ける
  badge?: string;
};

export type DocsChapterGroup = {
  label: string;
  chapters: DocsChapter[];
};

// ポイント交換の画面は、会社の設定で有効になっている場合だけメニューに表示される
export const EXCHANGE_BADGE = "ポイント交換";

export const DOCS_GROUPS: DocsChapterGroup[] = [
  {
    label: "はじめる",
    chapters: [
      { href: "/docs", title: "はじめに（全体の流れ）", summary: "コレクレの仕組みと、毎月の流れ" },
      { href: "/docs/first-login", title: "初回ログインとパスワード設定", summary: "招待メールの受け取りと、最初のログイン" },
      { href: "/docs/login", title: "ログイン・パスワードを忘れたとき", summary: "2回目以降のログインと、パスワードの再設定" },
    ],
  },
  {
    label: "毎日の操作",
    chapters: [
      { href: "/docs/dashboard", title: "ダッシュボードの見かた", summary: "ログイン後の画面と、それぞれの数字の意味" },
      { href: "/docs/mission-report", title: "ミッションを報告する", summary: "行動を報告して点数を獲得する" },
      { href: "/docs/points", title: "ポイントのたまり方と使いかた", summary: "点数とポイントの関係、翌月反映のルール" },
    ],
  },
  {
    label: "ポイント交換",
    chapters: [
      { href: "/docs/exchange", title: "商品・サービスと交換する", summary: "商品を探して、ポイントで交換を申請する", badge: EXCHANGE_BADGE },
      { href: "/docs/delivery-schedule", title: "お届け日を選ぶ・受け取る", summary: "配送商品のお届け日の選択と、受け取りの確認", badge: EXCHANGE_BADGE },
      { href: "/docs/reservation", title: "予約が必要なサービス", summary: "サロン・施術など、来店予約が必要な商品の使いかた", badge: EXCHANGE_BADGE },
      { href: "/docs/exchange-history", title: "交換履歴を確認する", summary: "申請した交換の状態と、お届け日・予約の確認", badge: EXCHANGE_BADGE },
    ],
  },
  {
    label: "確認・設定",
    chapters: [
      { href: "/docs/past-performance", title: "過去の実績を見る", summary: "月ごとの点数・達成率・報告内容のふり返り" },
      { href: "/docs/profile", title: "登録情報を変更する", summary: "氏名・住所・連絡先の変更" },
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
