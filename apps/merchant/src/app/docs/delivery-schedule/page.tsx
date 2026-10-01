import type { Metadata } from "next";

import {
  Callout,
  ChapterHeader,
  DocLink,
  Mark,
  PrevNext,
  Section,
  Shot,
  StatusChip,
  Step,
  Steps,
  Ui,
} from "../_components/content";

export const metadata: Metadata = { title: "お届け日の調整" };

const HREF = "/docs/delivery-schedule";

const FLOW = [
  { who: "申請者", text: "交換を申請する" },
  { who: "あなた", text: "お届け日の候補を提示する" },
  { who: "申請者", text: "候補から受け取る日を選ぶ（合う日がなければ希望日を伝える）" },
  { who: "自動", text: "お届け日が確定し、状態が「準備中」になる" },
  { who: "あなた", text: "発送予定日までに発送し「発送済みにする」" },
];

export default function DeliveryScheduleDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            商品の登録で<DocLink href="/docs/merchandise#new">「お届け日の日程調整を行う」</DocLink>をオンにした商品（冷蔵・冷凍品など）は、
            承認の前に<strong>申請者とお届け日を決める</strong>ステップが入ります。候補日はシステムが自動で作るので、確認して送るだけです。
          </>
        }
        goals={["お届け日を決めるまでの流れ", "候補日の提示のしかた", "申請者から別の希望日が届いたときの返事のしかた", "確定後に発送する日の確認"]}
      />

      <Section id="flow" title="お届け日が決まるまでの流れ">
        <ol className="space-y-2">
          {FLOW.map((step, index) => (
            <li key={step.text} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${
                  step.who === "あなた" ? "bg-teal-700" : step.who === "申請者" ? "bg-amber-500" : "bg-slate-500"
                }`}
              >
                {step.who}
              </span>
              <span className="text-sm leading-7 text-slate-800">{step.text}</span>
            </li>
          ))}
        </ol>
        <Callout kind="point">
          <p>
            お届け日を調整している間は、状態は <StatusChip status="申請中" /> のままです。<strong>お届け日が確定すると、自動で</strong>
            <StatusChip status="準備中" /> に進みます（<Ui>承認して準備に進める</Ui> を押す必要はありません）。
          </p>
        </Callout>
        <p>
          交換詳細の画面には「お届け日の調整」の欄が表示され、いまの状況が右側の色付きラベルで分かります。
          ラベルに <strong>「要対応」</strong> と書かれているときは、あなたの操作が必要です。
        </p>
      </Section>

      <Section id="propose" title="① お届け日の候補を提示する（候補日の提示待ち）">
        <p>
          申請が届くと、メール「【コレクレ】お届け候補日の提示をお願いします」が届き、やることリストに「お届け日の候補を出す」が表示されます。
          交換詳細を開くと、商品の設定と休業日カレンダーをもとに<strong>候補日が自動で作られています</strong>。
        </p>
        <Shot name="schedule-proposal" alt="お届け日の調整欄。候補日のチェックボックス、候補日の追加、連絡事項、提示ボタン" />
        <Steps>
          <Step number={1} title={<><Mark>1</Mark> 候補日を確認し、都合が悪い日はチェックを外します</>}>
            <p>
              最初はすべての候補にチェックが入っています。「◯月◯日 着」がお届け日、その下に発送する日と、申請者が選べる期限が表示されます。
            </p>
          </Step>
          <Step number={2} title={<>（必要なら）<Mark>2</Mark> 候補日を追加します</>}>
            <p>
              日付を選んで <Ui>追加</Ui> を押すと、候補を増やせます。発送できない曜日や休業日を追加すると黄色い注意が表示されますが、追加はできます。
            </p>
          </Step>
          <Step number={3} title={<>（任意）<Mark>3</Mark> 申請者への連絡事項を入力します</>}>
            <p>申請者の画面に表示されます。</p>
          </Step>
          <Step number={4} title={<><Mark>4</Mark> <Ui>◯ 件の候補日を提示する</Ui> を押します</>}>
            <p>申請者に候補日が届き、状況が「申請者の選択待ち」に変わります。</p>
          </Step>
        </Steps>
        <Callout kind="caution">
          <p>
            候補を出さないまま 1 日ほどたつと、催促のメールが届きます。申請者はポイントを預けたまま待っていますので、なるべく早く提示してください。
          </p>
        </Callout>
      </Section>

      <Section id="selection" title="② 申請者が選ぶのを待つ（申請者の選択待ち）">
        <Shot name="schedule-selection" alt="申請者の選択待ちの状態。提示した候補日の一覧" />
        <p>この間、あなたの操作は必要ありません。申請者が候補から日付を選ぶと、お届け日が確定します。</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>候補がすべて選択期限切れになった場合は、システムが自動で新しい候補を作って提示し直します。</li>
          <li>再提示できる回数には上限があり、上限を超えても決まらない場合、交換は自動でキャンセルされ、ポイントは申請者に返されます。</li>
        </ul>
      </Section>

      <Section id="respond" title="③ 申請者の希望日に返事をする（希望日への応答待ち）">
        <p>
          候補の中に受け取れる日がなかった場合、申請者から別の希望日が届きます（メール「【コレクレ】お届け希望日への応答をお願いします」）。
          <strong>3 営業日以内</strong>に、次のどれかで返事をしてください。
        </p>
        <Shot name="schedule-response" alt="希望日への応答待ち。希望到着日・希望時間帯・備考と、承諾・再提示・対応不可のボタン" />
        <p>
          画面上部に希望到着日・時間帯・備考と、<strong>システム判定</strong>（設定上その日に届けられるか）が表示されます。判定が黄色でも、臨時に対応できる場合はそのまま承諾して構いません。
        </p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <Mark>A</Mark> <Ui>この希望日で確定する（承諾）</Ui>：希望日でお届けします。お届け日が確定します。
          </li>
          <li>
            <Mark>B</Mark> <Ui>別の候補日を再提示する</Ui>：別の候補日を選び直して送ります（提示の手順は ① と同じです）。残り回数がボタンに表示されます。
          </li>
          <li>
            <Mark>C</Mark> <Ui>この希望日には対応できない</Ui>：上の欄に<strong>理由</strong>を入力してから押します。理由は申請者に表示されます。
          </li>
        </ul>
        <Callout kind="caution" title="返事をしないと自動でキャンセルされます">
          <p>
            期限を過ぎると催促のメールが届きます。それでも返事がない場合、交換は自動でキャンセルされ、ポイントは申請者に返されます。
          </p>
        </Callout>
      </Section>

      <Section id="confirmed" title="④ お届け日が確定したら、発送予定日までに発送する">
        <p>
          お届け日が確定すると、メールでお知らせが届き、状態が自動で <StatusChip status="準備中" /> になります。
          「お届け日の調整」の欄に、<strong>お届け日</strong>と、それに間に合わせるための<strong>発送予定日</strong>が表示されます。
        </p>
        <Shot name="schedule-confirmed" alt="日程確定の表示。お届け日と発送予定日" />
        <p>
          発送予定日が近づくと、やることリストに「商品を発送する」が表示されます。発送したら、
          <DocLink href="/docs/exchanges#ship">交換に対応する</DocLink> の章と同じ手順で <Ui>発送済みにする</Ui> を押してください。
        </p>
        <Shot name="schedule-confirmed-full" alt="日程確定後の交換詳細画面の全体" caption="日程確定後の交換詳細の全体。下の「状態を更新する」から発送済みにできます。" />
        <p>
          画面下の <Ui>日程調整の操作ログ</Ui> を押すと、候補の提示や選択がいつ行われたかを確認できます。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
