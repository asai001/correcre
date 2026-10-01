import type { Metadata } from "next";

import {
  AdminOnlyBadge,
  Callout,
  ChapterHeader,
  DocLink,
  Mark,
  PrevNext,
  Section,
  Shot,
  StatusChip,
  SubSection,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "ダッシュボードの見かた" };

const HREF = "/docs/dashboard";

const MENU = [
  { name: "ダッシュボード", desc: "ホーム画面です。いま対応が必要なことがまとめて表示されます。", href: "/docs/dashboard" },
  { name: "商品・サービス管理", desc: "掲載する商品の登録・編集・公開／非公開の切り替え。", href: "/docs/merchandise" },
  { name: "交換管理", desc: "申請者からの交換申請の確認と、状態（承認・発送・完了など）の更新。", href: "/docs/exchanges" },
  { name: "休業日カレンダー", desc: "定休日や臨時休業日の登録。お届け日の候補から自動で外れます。", href: "/docs/calendar" },
  { name: "収支・精算", desc: "月ごとの売上・手数料・請求額の確認と、請求メールの送信。", href: "/docs/settlement", admin: true },
  { name: "会社情報", desc: "登録した会社情報・振込先の確認と変更。", href: "/docs/company-info", admin: true },
  { name: "問い合わせ", desc: "運用者（コレクレ運営）への問い合わせ。", href: "/docs/support" },
  { name: "ユーザー管理", desc: "社内のほかの担当者を招待して、ログインできるようにします。", href: "/docs/users", admin: true },
];

const TODOS = [
  { title: "お届け日の候補を出す", level: "急ぎ", what: "お届け日の調整が必要な商品に申請がありました。候補日を提示してください。", href: "/docs/delivery-schedule#propose" },
  { title: "お客様の希望日に返事をする", level: "急ぎ", what: "申請者から別のお届け希望日が届いています。受けられるか返事をしてください。", href: "/docs/delivery-schedule#respond" },
  { title: "商品を発送する", level: "急ぎ／今週中", what: "お届け日が決まった商品の発送日が来ています。発送後「発送済みにする」を押します。", href: "/docs/exchanges#ship" },
  { title: "「届いていない」の連絡に対応する", level: "急ぎ", what: "申請者から未着の連絡がありました。配送状況を確認してください。", href: "/docs/exchanges#delivery-issue" },
  { title: "完了にする", level: "今週中", what: "お届け日を過ぎた交換があります。届いていれば「完了にする」を押します。", href: "/docs/exchanges#complete" },
  { title: "交換申請を承認する", level: "今週中（2日以上たつと急ぎ）", what: "新しい交換申請が届いています。内容を確認して承認してください。", href: "/docs/exchanges#approve" },
  { title: "お休みの日を登録する", level: "今週中", what: "お届け日の調整がある商品を出しているのに、休業日が未登録です。", href: "/docs/calendar" },
  { title: "◯月分の請求メールを送る", level: "今週中", what: "先月分の請求メールをまだ送っていません（管理者のみ表示）。", href: "/docs/settlement" },
  { title: "送り状番号を登録する", level: "気づいたときに", what: "発送済みの交換に送り状番号が未登録です（任意）。", href: "/docs/exchanges#tracking" },
  { title: "下書きの商品を公開する", level: "気づいたときに", what: "下書きのままの商品があります。下書きは申請者に表示されません。", href: "/docs/merchandise#draft" },
];

export default function DashboardDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            ログインすると、最初に<strong>ダッシュボード</strong>（ホーム画面）が表示されます。
            「いま何をすればよいか」が上から順に並んでいるので、<strong>迷ったらまずこの画面を見る</strong>のがおすすめです。
          </>
        }
        goals={["画面上部のメニューの使い方", "「やることリスト」の見かた", "数字のカードが表している内容"]}
      />

      <Section id="overview" title="画面全体">
        <Shot name="dashboard" alt="ダッシュボード画面の全体" caption="ダッシュボードの全体（表示内容はサンプルです）" />
        <p>上から順に、次のものが並んでいます。</p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>画面上部のメニュー（どの画面でも同じ場所にあります）</li>
          <li>やることリスト（いま対応が必要なこと）</li>
          <li>数字のカード（商品数・交換申請数など）</li>
          <li>直近の交換申請</li>
          <li>よく使う画面へのショートカット</li>
        </ol>
      </Section>

      <Section id="menu" title="画面上部のメニュー">
        <Shot name="dashboard-header" alt="画面上部のメニュー" />
        <p>
          <Mark>1</Mark> のメニューを押すと、それぞれの画面に移動できます。いま開いている画面には下線が付きます。
          右上には会社の表示名と、ログイン中のあなたのお名前が表示されます。<Mark>2</Mark> <Ui>ログアウト</Ui> でログアウトできます。
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-48 px-4 py-3 font-bold">メニュー</th>
                <th className="px-4 py-3 font-bold">できること</th>
              </tr>
            </thead>
            <tbody>
              {MENU.map((item) => (
                <tr key={item.name} className="border-t border-slate-100 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                    <DocLink href={item.href}>{item.name}</DocLink>
                    {item.admin ? (
                      <div className="mt-1">
                        <AdminOnlyBadge />
                      </div>
                    ) : null}
                  </th>
                  <td className="px-4 py-3 leading-7 text-slate-700">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="メニューの数が少ないときは">
          <p>
            <Ui>収支・精算</Ui>・<Ui>会社情報</Ui>・<Ui>ユーザー管理</Ui> は<strong>管理者</strong>にだけ表示されます。
            一般のユーザーには、次のように 5 つのメニューだけが表示されます。管理者にしてほしい場合は、運用者にご相談ください。
          </p>
          <Shot name="dashboard-header-general" alt="一般ユーザーに表示されるメニュー" />
        </Callout>
      </Section>

      <Section id="todo" title="やることリスト">
        <Shot name="dashboard-todo" alt="やることリストの表示例" />
        <p>
          あなたが対応しないと先に進まないことが、<strong>急ぐものから順に</strong>表示されます。
          お客様の名前や商品名の行を押すと、その交換の画面が直接開きます。下の黒いボタン（<Ui>交換管理を開く</Ui> など）からは一覧画面が開きます。
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">急ぎ</span>
            <p className="mt-2 text-sm leading-7 text-slate-700">申請者を待たせています。その日のうちに対応してください。</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">今週中</span>
            <p className="mt-2 text-sm leading-7 text-slate-700">数日以内に対応してください。</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">気づいたときに</span>
            <p className="mt-2 text-sm leading-7 text-slate-700">急ぎではありませんが、対応しておくと便利です。</p>
          </div>
        </div>

        <SubSection title="表示される「やること」の一覧">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="w-56 px-4 py-3 font-bold">表示</th>
                  <th className="w-32 px-4 py-3 font-bold">急ぎ度</th>
                  <th className="px-4 py-3 font-bold">内容</th>
                </tr>
              </thead>
              <tbody>
                {TODOS.map((todo) => (
                  <tr key={todo.title} className="border-t border-slate-100 align-top">
                    <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                      <DocLink href={todo.href}>{todo.title}</DocLink>
                    </th>
                    <td className="px-4 py-3 text-slate-700">{todo.level}</td>
                    <td className="px-4 py-3 leading-7 text-slate-700">{todo.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SubSection>
        <Callout kind="point">
          <p>
            「いま対応が必要なことはありません。」と表示されていれば、やることはすべて終わっています。
            新しい交換申請が届くとメールでもお知らせが届きますので、メールを受け取ったらダッシュボードを開いてください。
          </p>
        </Callout>
      </Section>

      <Section id="cards" title="数字のカードと直近の交換申請">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>公開中の商品数</strong>：申請者の画面に表示されている商品の数です。下に下書き・非公開の数も出ます。
          </li>
          <li>
            <strong>当月の交換申請数</strong>：今月届いた交換申請の数と、そのうち完了した数です。
          </li>
          <li>
            <strong>対応待ち</strong>：<StatusChip status="申請中" /> のまま、まだ承認していない交換の数です。
          </li>
          <li>
            <strong>対応中</strong>：<StatusChip status="準備中" /> と <StatusChip status="対応中" /> の交換の合計です。
          </li>
        </ul>
        <p>
          その下の「直近の交換申請」には、新しい順に 5 件まで表示されます。<Ui>すべて見る →</Ui> を押すと交換管理の画面が開きます。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
