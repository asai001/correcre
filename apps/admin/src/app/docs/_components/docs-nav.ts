// 操作ガイドの章立て。サイドメニュー・前後ページ送り・トップの目次はすべてこの一覧から作る。
// 章を追加・並べ替えるときはここだけを直す。
export type DocsChapter = {
  href: string;
  title: string;
  // トップページの目次に出す一言説明
  summary: string;
  // 章タイトル横に出すバッジ（必要になったときに使う）
  badge?: string;
};

export type DocsChapterGroup = {
  label: string;
  chapters: DocsChapter[];
};

export const DOCS_GROUPS: DocsChapterGroup[] = [
  {
    label: "はじめる",
    chapters: [
      { href: "/docs", title: "はじめに（全体の流れ）", summary: "コレクレの仕組みと、管理者の役割" },
      { href: "/docs/first-login", title: "初回ログインとパスワード設定", summary: "招待メールの受け取りと、最初のログイン" },
      { href: "/docs/login", title: "ログイン・パスワードを忘れたとき", summary: "2回目以降のログインと、パスワードの再設定" },
      { href: "/docs/dashboard", title: "ダッシュボードの見かた", summary: "ログイン後の画面と、会社全体の数字" },
    ],
  },
  {
    label: "ユーザー管理",
    chapters: [
      { href: "/docs/users", title: "従業員を登録・招待する", summary: "ユーザー登録、招待メール、一覧の見かた" },
      { href: "/docs/user-edit", title: "ユーザー情報の編集とポイント調整", summary: "登録内容の変更、権限、ポイントの加算・減算" },
      { href: "/docs/departments", title: "部署を管理する", summary: "部署の追加・名称変更・削除" },
    ],
  },
  {
    label: "分析・レポート",
    chapters: [
      { href: "/docs/analysis-overall", title: "全体分析を見る", summary: "会社・部署ごとの達成状況と推移" },
      { href: "/docs/analysis-individual", title: "個人分析を見る", summary: "従業員ひとりひとりの点数・達成率・交換履歴" },
      { href: "/docs/reports", title: "報告内容の確認とエクスポート", summary: "従業員の報告の確認、写真の表示、CSV / Excel 出力" },
    ],
  },
  {
    label: "各種情報・設定",
    chapters: [
      { href: "/docs/info", title: "理念体系・会社情報・ミッション項目", summary: "各種情報画面の 5 つのタブ" },
      { href: "/docs/billing", title: "請求情報と請求書", summary: "月額利用料の確認と、請求書の表示・ダウンロード" },
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
