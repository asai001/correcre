import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ダッシュボードの見かた" };

const HREF = "/docs/dashboard";

const CARDS = [
  { name: "今月の獲得点数", desc: "今月、ミッションの報告でもらった点数の合計です。1 か月の満点は 100 点です。" },
  { name: "現在の保有ポイント", desc: "いま使えるポイントです。ポイント交換ではこのポイントを使います。" },
  { name: "翌月反映予定", desc: "今月の報告でもらったポイントです。翌月 1 日に「現在の保有ポイント」に加わります。" },
  { name: "先月の獲得ポイント", desc: "先月 1 か月でもらったポイントの合計です。" },
];

export default function DashboardDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            ログインすると、最初に<strong>ダッシュボード</strong>（ホーム画面）が表示されます。
            会社の理念、あなたの点数とポイント、今月のミッションがひとつの画面にまとまっているので、<strong>毎日の報告はこの画面から</strong>行います。
          </>
        }
        goals={["ダッシュボードに並んでいるものの意味", "4 つの数字のカードの見かた", "ほかの画面への移動のしかた"]}
      />

      <Section id="overview" title="画面全体">
        <Shot name="dashboard" alt="ダッシュボード画面の全体" caption="ダッシュボードの全体（表示内容はサンプルです）" />
        <p>上から順に、次のものが並んでいます。</p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>会社名と <Ui>ログアウト</Ui> ボタン</li>
          <li>会社の理念（経営理念・ミッション・ビジョンなど、会社が登録した内容）</li>
          <li>お知らせ（お届け日の選択や予約が必要な交換があるときだけ表示されます）</li>
          <li>あなたのお名前・所属・最終ログイン日時</li>
          <li>4 つの数字のカード（点数とポイント）</li>
          <li>ミッション報告（今月のミッションの一覧と <Ui>報告する</Ui> ボタン）</li>
          <li>ほかの画面へのショートカット</li>
          <li>過去 24 か月の実績グラフと、交換履歴</li>
        </ol>
      </Section>

      <Section id="top" title="会社の理念とお知らせ">
        <Shot name="dashboard-top" alt="ダッシュボードの上部。会社名、ログアウトボタン、理念、お知らせ" />
        <p>
          <Mark>1</Mark> には会社の理念が表示されます。ミッションは、この理念に沿った行動として決められています。報告の前に、ときどき読み返してみてください。
          右上の <Mark>2</Mark> <Ui>ログアウト</Ui> でログアウトできます。
        </p>
        <SubSection title="お知らせが表示されるとき">
          <Shot name="dashboard-banners" alt="お届け日の選択が必要な交換と、予約が必要な交換のお知らせ" />
          <p>
            ポイント交換で<strong>あなたの操作が必要なこと</strong>があると、理念の下に黄色いお知らせが出ます。
            <Ui>お届け日を選ぶ →</Ui> や <Ui>予約案内を見る →</Ui> を押すと、その交換の画面が開きます。
            くわしくは <DocLink href="/docs/delivery-schedule">お届け日を選ぶ・受け取る</DocLink> と <DocLink href="/docs/reservation">予約が必要なサービス</DocLink> をご覧ください。
          </p>
        </SubSection>
      </Section>

      <Section id="cards" title="4 つの数字のカード">
        <Shot name="dashboard-summary" alt="今月の獲得点数、現在の保有ポイント、翌月反映予定、先月の獲得ポイントの4枚のカード" />
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
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                    {card.name}
                  </th>
                  <td className="px-4 py-3 leading-7 text-slate-700">{card.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="point">
          <p>
            「今月の獲得点数」は<strong>点</strong>、ほかの 3 つは<strong>ポイント</strong>です。点数がどうポイントに変わるかは
            <DocLink href="/docs/points">ポイントのたまり方と使いかた</DocLink> で説明しています。
          </p>
        </Callout>
      </Section>

      <Section id="mission" title="ミッション報告">
        <Shot name="mission-cards" alt="ミッション報告の一覧。ミッションごとにカードと報告するボタンが並ぶ" />
        <p>
          今月のミッションがカードで並びます。ミッションを実行したら <Ui>報告する</Ui> を押して報告します。
          カードの右上の <strong>(2/20)</strong> のような数字は「今月の報告回数 / 月の上限回数」です。
          報告のしかたは次の章 <DocLink href="/docs/mission-report">ミッションを報告する</DocLink> でくわしく説明します。
        </p>
      </Section>

      <Section id="links" title="ほかの画面への移動">
        <Shot name="dashboard-links" alt="ポイント交換、過去の実績、登録情報変更のショートカット" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Ui>ポイント交換</Ui>：商品・サービスの一覧が開きます（<DocLink href="/docs/exchange">商品・サービスと交換する</DocLink>）。会社の設定で交換が有効な場合だけ表示されます。
          </li>
          <li>
            <Ui>過去の実績</Ui>：月ごとの点数や達成率をふり返る画面です（<DocLink href="/docs/past-performance">過去の実績を見る</DocLink>）。
          </li>
          <li>
            <Ui>登録情報変更</Ui>：氏名・住所・連絡先を変更する画面が開きます（<DocLink href="/docs/profile">登録情報を変更する</DocLink>）。
          </li>
        </ul>
        <Callout kind="info" title="ダッシュボード以外の画面では">
          <p>
            ポイント交換や過去の実績の画面では、画面の上部に紺色のメニュー（<Ui>ダッシュボード</Ui>・<Ui>ポイント交換</Ui>・<Ui>ポイント交換履歴</Ui>・<Ui>過去の実績</Ui>）が表示されます。
            <Ui>ダッシュボード</Ui> を押すと、いつでもこの画面に戻れます。
          </p>
          <Shot name="exchange-header" alt="ポイント交換画面の上部メニュー" />
        </Callout>
      </Section>

      <Section id="history" title="過去 24 か月の実績と交換履歴">
        <Shot name="dashboard-history" alt="過去24ヶ月の実績の折れ線グラフと交換履歴の表" />
        <p>
          <strong>過去 24 ヶ月の実績</strong>は、月ごとの獲得点数の折れ線グラフです。右へ行くほど新しい月です。
          その下の<strong>交換履歴</strong>には、ポイント交換を申請した商品と状態が新しい順に表示されます（<DocLink href="/docs/exchange-history">交換履歴を確認する</DocLink>）。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
