import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, FieldTable, Mark, PrevNext, Section, Shot, Step, Steps, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "ミッションを報告する" };

const HREF = "/docs/mission-report";

export default function MissionReportDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            ミッションは、会社が「理念に沿ってしてほしい行動」として決めたものです。実行したら、ダッシュボードから<strong>報告</strong>します。
            報告すると、そのミッションに決められた<strong>点数</strong>がもらえます。
          </>
        }
        goals={["ミッションの内容と点数の確認のしかた", "報告の手順と、入力する内容", "月の上限回数と「達成済み」の意味"]}
      />

      <Section id="cards" title="ミッションのカードを見る">
        <Shot name="mission-cards" alt="ミッション報告の一覧" />
        <p>ダッシュボードの「ミッション報告」に、今月のミッションがカードで並んでいます。カードには次のことが書かれています。</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>ミッション名と説明</strong>：何をすればよいかの短い説明です。
          </li>
          <li>
            <strong>(2/20) のような数字</strong>：「今月すでに報告した回数 / 1 か月に報告できる上限回数」です。残りが少なくなるほど、数字の色が赤 → 黄 → 緑と変わります。
          </li>
          <li>
            <Ui>報告する</Ui> ボタン：押すと報告の入力画面が開きます。上限回数まで報告すると <Ui>達成済み</Ui> に変わり、その月はそれ以上報告できません。
          </li>
        </ul>
        <SubSection title="ミッションの点数・回数を一覧で確認する">
          <p>
            一番最後のカード「各ミッションの詳細はこちら」の <Ui>ミッション一覧を見る</Ui> を押すと、すべてのミッションの<strong>点数・月間実施回数・説明・報告項目</strong>を表で確認できます。
          </p>
          <Shot name="mission-list" alt="ミッション一覧のダイアログ。ミッション、カテゴリ、点数、月間実施回数、説明、報告項目の表" />
        </SubSection>
      </Section>

      <Section id="report" title="報告する">
        <Steps>
          <Step number={1} title={<>報告したいミッションのカードで <Mark>1</Mark> <Ui>報告する</Ui> を押します</>}>
            <Shot name="mission-cards" alt="ミッションのカードの報告するボタン" />
          </Step>
          <Step number={2} title="報告の内容を入力します">
            <Shot name="mission-dialog" alt="ミッション報告の入力画面。入力項目と獲得点数、報告するボタン" maxWidth={640} />
            <p>
              入力する項目はミッションごとに違います（会社が決めています）。<strong>*</strong> の付いた項目は必須です。
              項目の下に書かれている説明文（例：「資料名・学習内容・どう活かすかを入力」）を参考に、具体的に書きましょう。
            </p>
            <FieldTable
              rows={[
                { name: "文章の入力欄", required: true, description: "実施した内容を書きます。文字数の下限・上限が決められている場合は、欄の下に表示されます。", example: "朝礼で今週の目標を共有し、後輩の相談に乗った" },
                { name: "日付・日時", required: true, description: "実施した日（日時）を選びます。開いたときの日付が自動で入っているので、違う日なら直してください。", example: "2026/10/30" },
                { name: "選択肢", required: false, description: "あらかじめ用意された選択肢から選びます。複数選べる項目もあります。" },
                { name: "画像", required: false, description: (
                  <>
                    <Ui>画像を選択</Ui> を押して、スマートフォンやパソコンの写真を添付します。JPEG・PNG・GIF・WebP・HEIC 形式、1 枚 10MB までです。
                    添付した画像の右の ✕ で取り消せます。
                  </>
                ) },
              ]}
            />
            <Shot name="mission-dialog-image" alt="画像を添付する項目があるミッション報告の入力画面" maxWidth={640} />
            <p>
              一番下の <Mark>2</Mark> <strong>獲得点数</strong> に、このミッションを報告するともらえる点数が表示されます。
            </p>
          </Step>
          <Step number={3} title={<><Mark>3</Mark> <Ui>報告する</Ui> を押します</>}>
            <p>
              「送信完了」と表示されれば報告は完了です。<Ui>OK</Ui> を押して閉じると、カードの回数が 1 つ増え、ダッシュボードの「今月の獲得点数」と「翌月反映予定」も更新されます。
            </p>
            <Shot name="mission-success" alt="送信完了のダイアログ" maxWidth={480} />
          </Step>
        </Steps>
        <Callout kind="tip" title="入力途中の内容は自動で残ります">
          <p>
            入力の途中で <Ui>キャンセル</Ui> を押したり画面を閉じたりしても、入力していた内容は<strong>同じ端末・ブラウザに一時的に保存</strong>されています。
            次に同じミッションの <Ui>報告する</Ui> を押すと、続きから入力できます（報告を送信すると消えます）。
          </p>
        </Callout>
        <Callout kind="caution" title="報告は取り消せません">
          <p>
            一度送信した報告は、ご自身では取り消しや修正ができません。間違えて送信してしまった場合は、会社の管理者にご連絡ください。
          </p>
        </Callout>
      </Section>

      <Section id="limit" title="月の上限回数と点数の目安">
        <p>
          それぞれのミッションには<strong>1 か月に報告できる上限回数</strong>があります。たとえば「挨拶活動（1 点・20 回）」なら、1 か月に 20 回まで、1 回ごとに 1 点です。
          すべてのミッションを上限まで達成すると、その月は<strong>100 点（満点）</strong>になります。
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>上限に達したミッションは <Ui>達成済み</Ui> と表示され、翌月 1 日になるとまた報告できるようになります。</li>
          <li>月をまたいだ報告はできません。月末の行動は、その月のうちに報告しておきましょう。</li>
          <li>ミッションの内容や点数は、会社が月の初めから変更することがあります。変わったときは、カードの内容も新しくなります。</li>
        </ul>
        <Callout kind="info" title="「このミッションは今月の実施回数の上限に達しています」と表示されたら">
          <p>
            別の端末などで、すでに上限まで報告しています。画面を再読み込み（更新）すると、最新の回数が表示されます。
          </p>
        </Callout>
        <p>
          もらった点数が、どのようにポイントになるかは次の章 <DocLink href="/docs/points">ポイントのたまり方と使いかた</DocLink> をご覧ください。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
