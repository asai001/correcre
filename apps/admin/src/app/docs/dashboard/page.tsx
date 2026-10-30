import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ダッシュボードの見かた" };

const HREF = "/docs/dashboard";

const MENU = [
  { name: "ダッシュボード", desc: "ホーム画面です。会社全体の数字と、直近の報告が表示されます。", href: "/docs/dashboard" },
  { name: "ユーザー管理", desc: "従業員の登録・編集、招待メールの再送、部署の管理、ポイント調整。", href: "/docs/users" },
  { name: "分析・レポート", desc: "全体分析と個人分析。達成率の推移や報告内容を確認できます。", href: "/docs/analysis-overall" },
  { name: "各種情報", desc: "理念体系・会社情報・登録人数・部署一覧・ミッション項目・請求情報。", href: "/docs/info" },
  { name: "問い合わせ", desc: "運用者（コレクレ運営）への問い合わせ。", href: "/docs/support" },
];

const CARDS = [
  { name: "管理対象従業員数", desc: "現在「有効」になっている従業員の人数です。月額のID料金はこの人数で計算されます。" },
  { name: "先月総獲得ポイント", desc: "先月 1 か月に、従業員全員がミッションの報告で獲得したポイントの合計です。" },
  { name: "今月交換ポイント", desc: "今月、従業員がポイント交換の申請で使ったポイントの合計です。" },
  { name: "企業保有ポイント", desc: "会社として保有しているポイントの残高です。従業員へのポイント付与の原資になります。" },
];

export default function DashboardDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            ログインすると、最初に<strong>ダッシュボード</strong>（ホーム画面）が表示されます。
            会社全体の数字と、直近の従業員の報告がひと目で分かるので、<strong>毎日の確認はこの画面から</strong>始めるのがおすすめです。
          </>
        }
        goals={["画面上部のメニューの使い方", "数字のカードとグラフが表している内容", "直近の報告の見かた"]}
      />

      <Section id="overview" title="画面全体">
        <Shot name="dashboard" alt="ダッシュボード画面の全体" caption="ダッシュボードの全体（表示内容はサンプルです）" />
        <p>上から順に、次のものが並んでいます。</p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>会社名と <Ui>ログアウト</Ui> ボタン</li>
          <li>ログイン中のあなたのお名前と、管理対象従業員数</li>
          <li>数字のカード（先月総獲得ポイント・今月交換ポイント・企業保有ポイント）</li>
          <li>各画面へのショートカット</li>
          <li>2 つのグラフ（平均獲得点数推移・項目ごとの平均達成割合）</li>
          <li>報告内容（従業員の直近の報告）</li>
        </ol>
      </Section>

      <Section id="menu" title="画面上部のメニュー">
        <Shot name="header" alt="画面上部のメニュー" />
        <p>
          ダッシュボード以外の画面では、上部に青いメニューが表示されます。<Mark>1</Mark> のメニューを押すと、それぞれの画面に移動できます。いま開いている画面には下線が付きます。
          右上にはログイン中のあなたのお名前が表示され、<Mark>2</Mark> <Ui>ログアウト</Ui> でログアウトできます。
          ダッシュボードでは、代わりに <Mark>3</Mark> のショートカットのカードから各画面へ移動します。
        </p>
        <Shot name="dashboard-menu" alt="ダッシュボードの各画面へのショートカットのカード" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-44 px-4 py-3 font-bold">メニュー</th>
                <th className="px-4 py-3 font-bold">できること</th>
              </tr>
            </thead>
            <tbody>
              {MENU.map((item) => (
                <tr key={item.name} className="border-t border-slate-100 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                    <DocLink href={item.href}>{item.name}</DocLink>
                  </th>
                  <td className="px-4 py-3 leading-7 text-slate-700">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="cards" title="数字のカード">
        <Shot name="dashboard-summary" alt="管理対象従業員数と、先月総獲得ポイント・今月交換ポイント・企業保有ポイントのカード" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-48 px-4 py-3 font-bold">カード</th>
                <th className="px-4 py-3 font-bold">意味</th>
              </tr>
            </thead>
            <tbody>
              {CARDS.map((card) => (
                <tr key={card.name} className="border-t border-slate-100 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">{card.name}</th>
                  <td className="px-4 py-3 leading-7 text-slate-700">{card.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="企業保有ポイントについて">
          <p>
            企業保有ポイントは、運用者が契約内容に応じて設定・補充します。残高の増減についてご不明な点は、<DocLink href="/docs/support">運用者にお問い合わせ</DocLink>ください。
          </p>
        </Callout>
      </Section>

      <Section id="charts" title="2 つのグラフ">
        <Shot name="dashboard-charts" alt="平均獲得点数推移の折れ線グラフと、項目ごとの平均達成割合の棒グラフ" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> <strong>平均獲得点数推移</strong>：従業員 1 人あたりの月間獲得点数（満点 100 点）の平均を、過去 12 か月分の折れ線で表示します。
          </li>
          <li>
            <Mark>2</Mark> <strong>項目ごとの平均達成割合（先月）</strong>：先月、ミッションごとに上限回数の何 % まで報告されたかの平均です。低い項目は、取り組みにくいミッションかもしれません。
          </li>
        </ul>
        <p>
          期間や部署を指定したくわしい分析は、<DocLink href="/docs/analysis-overall">全体分析を見る</DocLink> をご覧ください。
        </p>
      </Section>

      <Section id="reports" title="報告内容（直近の報告）">
        <Shot name="reports-table" alt="報告内容の表。日付、社員名、項目名、進捗、入力内容" />
        <p>
          従業員が送った報告が、新しい順に表示されます。誰が・いつ・どのミッションを・どんな内容で報告したかが分かります。
          写真付きの報告は <Ui>アップロード写真</Ui> を押すと写真を見られます。右上の <Ui>データエクスポート</Ui> で CSV / Excel に出力できます。
          くわしくは <DocLink href="/docs/reports">報告内容の確認とエクスポート</DocLink> をご覧ください。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
