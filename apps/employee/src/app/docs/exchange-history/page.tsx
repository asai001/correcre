import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, StatusChip, Ui } from "../_components/content";

export const metadata: Metadata = { title: "交換履歴を確認する" };

const HREF = "/docs/exchange-history";

const COLUMN_VALUES = [
  ["選択してください", "お届け日の候補が届いています。押してお届け日を選んでください。"],
  ["調整中", "提携企業が候補を準備中、またはあなたの希望日を確認中です。あなたの操作は不要です。"],
  ["10月15日(水) などの日付", "確定したお届け日です。押すと配送状況や受け取りの確認ができます。"],
  ["ご予約ください", "予約が必要なサービスの申請が承認されました。押して予約案内を確認してください。"],
  ["承認後にご案内", "予約が必要なサービスで、まだ承認待ちです。承認されると予約案内に変わります。"],
  ["予約案内", "完了した予約型サービスです。押すと予約案内を見返せます。"],
  ["-", "お届け日の調整も予約も不要な商品、または却下・キャンセルされた交換です。"],
];

export default function ExchangeHistoryDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            これまでに申請した交換の一覧です。<strong>いまどの状態か</strong>と、お届け日・予約の案内をまとめて確認できます。
            ダッシュボードの下の「交換履歴」と、上部メニューの <Ui>ポイント交換履歴</Ui> は同じ内容です。
          </>
        }
        goals={["交換履歴の表の見かた", "「お届け日・予約」の列の意味"]}
      />

      <Section id="table" title="表の見かた">
        <Shot name="exchange-history" alt="ポイント交換履歴の画面" />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>日付</strong>：交換を申請した日です。新しいものが上に表示されます。
          </li>
          <li>
            <strong>提携企業・景品・サービス</strong>：商品を提供する会社と、商品名です。
          </li>
          <li>
            <strong>状態</strong>：<StatusChip status="申請中" /> → <StatusChip status="準備中" /> → <StatusChip status="対応中" /> → <StatusChip status="完了" /> の順に進みます。
            <StatusChip status="却下" />・<StatusChip status="キャンセル" /> の場合、ポイントは戻っています。それぞれの意味は <DocLink href="/docs/exchange#after">申請したあとの流れ</DocLink> をご覧ください。
          </li>
          <li>
            <strong>使用ポイント</strong>：その交換で使ったポイントです。
          </li>
          <li>
            <strong>お届け日・予約</strong>：あなたの操作が必要なときはここに黄色い表示が出ます（下の表）。
          </li>
        </ul>
        <p>
          表の下の <Ui>表示件数</Ui> で 1 ページに表示する件数を変えられ、<Mark>1</Mark> の矢印でページを移動できます。
        </p>
      </Section>

      <Section id="column" title="「お届け日・予約」の列の意味">
        <Shot name="exchange-history-column" alt="お届け日・予約の列の表示例" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-56 px-4 py-3 font-bold">表示</th>
                <th className="px-4 py-3 font-bold">意味</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              {COLUMN_VALUES.map(([label, desc]) => (
                <tr key={label} className="border-t border-slate-100">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">{label}</th>
                  <td className="px-4 py-3 text-slate-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="point">
          <p>
            <strong>黄色い表示</strong>（<Ui>選択してください</Ui>・<Ui>ご予約ください</Ui>）は、あなたの操作待ちです。見つけたら早めに対応してください。
          </p>
        </Callout>
      </Section>

      <Section id="past" title="期間を指定して見る・CSV で保存する">
        <p>
          <DocLink href="/docs/past-performance">過去の実績</DocLink> の画面でも、「ポイント交換履歴」として期間を指定した一覧を見られます。
          そちらでは <Ui>データエクスポート</Ui> から CSV ファイルとして保存することもできます。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
