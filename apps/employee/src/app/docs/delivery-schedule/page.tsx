import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "お届け日を選ぶ・受け取る" };

const HREF = "/docs/delivery-schedule";

const MAILS = [
  ["【コレクレ】お届け日を選択してください", "提携企業がお届け日の候補を出しました。期限内に候補から選んでください。"],
  ["【コレクレ】お届け日の候補が再提示されました", "候補が新しくなりました。もう一度選んでください。"],
  ["【コレクレ】お届け日の選択期限が近づいています", "選択期限の前日のお知らせです。まだ選んでいない場合は選んでください。"],
  ["【コレクレ】お届け希望日に対応できませんでした", "あなたが伝えた希望日に提携企業が対応できませんでした。候補から選び直してください。"],
  ["【コレクレ】お届け日が確定しました", "お届け日が決まりました。当日はお受け取りをお願いします。"],
  ["【コレクレ】明日は商品のお届け日です", "お届け日の前日のリマインドです。"],
  ["【コレクレ】交換がキャンセルされ、ポイントを返還しました", "交換がキャンセルされ、ポイントが戻りました。"],
];

export default function DeliveryScheduleDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            冷蔵品・生鮮品など、<strong>お届け日を決めてから発送する商品</strong>では、交換の承認後に提携企業からお届け日の候補が届きます。
            あなたが候補から日にちを選ぶとお届け日が確定し、商品が届いたら <Ui>受け取りました</Ui> を押して完了です。
          </>
        }
        goals={["お届け日を選ぶ画面の開きかた", "候補から選ぶ手順と、希望日を伝える方法", "受け取りの確認と、届かないときの連絡"]}
      />

      <Section id="open" title="お届け日を選ぶ画面を開く">
        <p>選択が必要になると、次の 3 か所からお知らせされます。どこからでも同じ画面が開きます。</p>
        <SubSection title="ダッシュボードのお知らせ">
          <Shot name="schedule-banner" alt="お届け日の選択が必要な交換がありますのお知らせ" />
          <p>
            黄色いお知らせに商品名と、最短の候補をいつまで選べるかが表示されます。<Mark>1</Mark> <Ui>お届け日を選ぶ →</Ui> を押します。
            青いお知らせ（「提携企業と調整中です」）は、提携企業の対応待ちで、あなたの操作は不要です。
          </p>
        </SubSection>
        <SubSection title="交換履歴の「お届け日・予約」の列">
          <Shot name="exchange-history-column" alt="交換履歴の表のお届け日・予約の列。選択してくださいのリンク" />
          <p>
            <Ui>選択してください</Ui> のリンクを押します。お届け日が決まると、ここに日付が表示されます。
          </p>
        </SubSection>
        <SubSection title="メールのお知らせ">
          <p>件名 <strong>「【コレクレ】お届け日を選択してください」</strong> のメールにも、画面へのリンクが書かれています。</p>
        </SubSection>
      </Section>

      <Section id="select" title="候補からお届け日を選ぶ">
        <Shot name="schedule-select" alt="お届け日の選択画面。候補日のカード、お届け時間帯、確定ボタン" maxWidth={720} />
        <Steps>
          <Step number={1} title={<><Mark>1</Mark> 受け取れる日を 1 つ押して選びます</>}>
            <p>
              候補ごとに「◯月◯日(◯) 着」と、「◯月◯日 12:00まで選択可能」のような<strong>選択期限</strong>が書かれています。
              期限を過ぎた候補は「受付終了」と表示され、選べません。
            </p>
          </Step>
          <Step number={2} title={<>（表示される場合）<Mark>2</Mark> <Ui>お届け時間帯（任意）</Ui> を選びます</>}>
            <p>午前中・14〜16 時 などの時間帯を指定できます。指定しない場合は「指定なし」のままでかまいません。</p>
          </Step>
          <Step number={3} title={<>（冷蔵・冷凍の商品）注意事項を読んで <Ui>確認しました</Ui> にチェックを入れます</>}>
            <Shot name="schedule-select-fresh" alt="生鮮品の注意事項と確認しましたのチェックボックス" maxWidth={720} />
            <Callout kind="caution" title="生鮮品は受け取れないとポイントが戻りません">
              <p>
                冷蔵・冷凍の商品は、指定した日時に受け取れなかった場合、商品が破棄され<strong>ポイントの返還・再送はできません</strong>。
                確実に受け取れる日時を選んでください。
              </p>
            </Callout>
          </Step>
          <Step number={4} title={<><Mark>3</Mark> <Ui>◯月◯日(◯) で確定する</Ui> を押します</>}>
            <p>
              「お届け日を確定しました。前日にリマインドをお送りします。」と表示されれば完了です。提携企業はこの日に届くように発送します。
            </p>
          </Step>
        </Steps>
      </Section>

      <Section id="request" title="候補の中に受け取れる日がないとき">
        <p>
          候補の下の <Ui>この中に受け取れる日がない（希望日を伝える）</Ui> を押すと、希望のお届け日を提携企業に伝えられます。
        </p>
        <Shot name="schedule-request" alt="希望のお届け日を伝えるフォーム。希望日、希望時間帯、備考、この内容で希望を送るボタン" maxWidth={720} />
        <Steps>
          <Step number={1} title={<><Mark>1</Mark> <Ui>希望日</Ui> を入力します（必要なら時間帯・備考も）</>}>
            <p>備考には「平日は 20 時まで不在のため週末を希望します」のように、事情を書いておくと提携企業が調整しやすくなります。</p>
          </Step>
          <Step number={2} title={<><Mark>2</Mark> <Ui>この内容で希望を送る</Ui> を押します</>}>
            <p>
              提携企業が対応できるかを確認し、<strong>最大 3 営業日</strong>以内に回答します。その間、画面には「希望日を提携企業に確認しています」と表示されます。
            </p>
            <Shot name="schedule-waiting" alt="希望日を提携企業に確認していますの表示" maxWidth={720} />
          </Step>
          <Step number={3} title="回答を待ちます">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>対応できる場合</strong>：希望日でお届け日が<strong>そのまま確定</strong>します（メール「お届け日が確定しました」が届きます）。
              </li>
              <li>
                <strong>対応できない場合</strong>：理由とともに新しい候補が提示されます。候補から選び直してください。
              </li>
            </ul>
            <Shot name="schedule-rejected" alt="希望日に対応できなかった理由と、新しい候補" maxWidth={720} />
          </Step>
        </Steps>
        <Callout kind="info">
          <p>
            希望日を伝えられるのは、1 つの交換につき <strong>2 回まで</strong>です（残り回数はフォームの見出しに表示されます）。
            <Ui>候補から選び直す</Ui> を押すと、希望を送らずに候補の選択に戻れます。
          </p>
        </Callout>
      </Section>

      <Section id="confirmed" title="お届け日が決まったあと・受け取ったとき">
        <Shot name="schedule-confirmed" alt="お届け日が確定した画面。お届け日、配送状況、受け取りましたボタン" maxWidth={720} />
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Mark>1</Mark> 確定したお届け日が表示されます。前日にはリマインドのメール（「明日は商品のお届け日です」）が届きます。
          </li>
          <li>
            <Mark>2</Mark> 提携企業が送り状番号を登録した場合は<strong>配送状況</strong>が表示され、<Ui>配送状況を確認する</Ui> から配送会社のサイトで追跡できます（登録は任意のため、表示されない場合もあります）。
          </li>
          <li>
            <Mark>3</Mark> 商品が届いたら <Ui>受け取りました</Ui> を押します。確認のメッセージで OK を押すと、交換が<strong>完了</strong>になり、使ったポイントが確定します。
          </li>
        </ul>
        <Callout kind="point" title="「受け取りました」は届いてから押してください">
          <p>
            受け取りの確認は、商品が手元に届いたことを提携企業に伝える大切な操作です。<strong>届いていないうちは押さないでください。</strong>
            押さなくても、お届け日から一定期間がたつと提携企業側で完了にすることがあります。
          </p>
        </Callout>
        <SubSection title="お届け日を過ぎても届かないとき">
          <Shot name="schedule-issue" alt="届いていないを押したときの連絡フォーム" maxWidth={720} />
          <p>
            <Ui>受け取りました</Ui> の下の <Ui>届いていない</Ui> を押し、状況を書いて <Ui>この内容で連絡する</Ui> を押します。提携企業に連絡が届き、配送状況を確認します。
            連絡後は「提携企業が確認中です」と表示されます。
          </p>
        </SubSection>
      </Section>

      <Section id="cancel" title="交換をキャンセルする">
        <p>
          お届け日が確定する前（候補の提示待ち・候補の選択中・希望日の確認中）であれば、画面の一番下の
          <Ui>交換をキャンセルする（ポイントは全額返還されます）</Ui> からご自身でキャンセルできます。確認のメッセージで OK を押すと、使ったポイントがすぐに戻ります。
        </p>
        <Shot name="schedule-cancelled" alt="キャンセルされた交換の表示" maxWidth={720} />
        <Callout kind="caution">
          <p>
            お届け日が確定したあとは、画面からキャンセルできません。どうしても受け取れなくなった場合は、早めに提携企業または会社の管理者にご相談ください。
            候補の選択期限をすべて過ぎてしまった場合も、提携企業に状況を確認してください。
          </p>
        </Callout>
      </Section>

      <Section id="mails" title="届くメールの一覧">
        <p>お届け日の調整では、節目ごとに次のメールが届きます。どのメールにも、交換の画面へのリンクが書かれています。</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-72 px-4 py-3 font-bold">件名</th>
                <th className="px-4 py-3 font-bold">内容</th>
              </tr>
            </thead>
            <tbody className="align-top leading-7">
              {MAILS.map(([subject, desc]) => (
                <tr key={subject} className="border-t border-slate-100">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">{subject}</th>
                  <td className="px-4 py-3 text-slate-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          お届け日の調整がない商品（提携企業がそのまま発送する商品）では、これらのメールは届きません。状態は <DocLink href="/docs/exchange-history">交換履歴</DocLink> でご確認ください。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
