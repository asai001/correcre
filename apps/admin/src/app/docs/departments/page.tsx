import type { Metadata } from "next";

import { Callout, ChapterHeader, DocLink, Mark, PrevNext, Section, Shot, Step, Steps, SubSection, Ui } from "../_components/content";

export const metadata: Metadata = { title: "部署を管理する" };

const HREF = "/docs/departments";

export default function DepartmentsDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            部署は、従業員をグループ分けするための単位です。ユーザー一覧の絞り込みや、分析・レポートの<strong>部署ごとの集計</strong>に使われます。
            部署の追加・名称変更・削除は、ユーザー管理の <Ui>部署管理</Ui> から行います。
          </>
        }
        goals={["部署の追加・名称変更・削除", "部署を削除できないとき", "各種情報画面の部署一覧との違い"]}
      />

      <Section id="open" title="部署管理を開く">
        <p>
          上部メニューの <Ui>ユーザー管理</Ui> を開き、<Ui>部署管理</Ui> を押します。
        </p>
        <Shot name="departments-dialog" alt="部署管理のダイアログ。部署を追加の入力欄と、部署の一覧" maxWidth={640} />
      </Section>

      <Section id="manage" title="部署を追加・変更・削除する">
        <SubSection title="追加する">
          <Steps>
            <Step number={1} title={<><Mark>1</Mark> <Ui>部署名</Ui> に新しい部署の名前を入力します</>} />
            <Step number={2} title={<><Mark>2</Mark> <Ui>追加</Ui> を押します</>}>
              <p>一覧に追加され、「部署「◯◯」を追加しました」と表示されます。同じ名前の部署は追加できません。</p>
            </Step>
          </Steps>
          <Callout kind="tip">
            <p>
              従業員を登録・編集するときに、所属部署の欄に<strong>新しい部署名を直接入力</strong>しても部署を追加できます。1 人ずつ登録しながら部署を作る場合はこちらが手軽です。
            </p>
          </Callout>
        </SubSection>
        <SubSection title="名称を変更する">
          <Steps>
            <Step number={1} title={<>変更したい部署の行の <Mark>3</Mark> 鉛筆のマークを押します</>} />
            <Step number={2} title={<>新しい名前を入力し、チェックのマークを押します</>}>
              <p>その部署に所属している従業員の部署名も、まとめて新しい名前に変わります。やめる場合は ✕ を押します。</p>
            </Step>
          </Steps>
        </SubSection>
        <SubSection title="削除する">
          <Steps>
            <Step number={1} title={<>削除したい部署の行の <Mark>4</Mark> ゴミ箱のマークを押します</>} />
            <Step number={2} title={<>確認の画面で <Ui>削除</Ui> を押します</>}>
              <Shot name="departments-delete" alt="部署を削除の確認ダイアログ" maxWidth={480} />
            </Step>
          </Steps>
          <Callout kind="caution" title="所属している従業員がいる部署は削除できません">
            <p>
              部署の行に「◯名所属」と表示されている部署は削除できません。先に、所属している従業員をユーザー編集でほかの部署に移してから削除してください。
            </p>
          </Callout>
        </SubSection>
      </Section>

      <Section id="info-tab" title="各種情報画面の「部署一覧」との違い">
        <p>
          <DocLink href="/docs/info#departments">各種情報</DocLink> の「部署一覧」タブでは、部署ごとの<strong>所属従業員の一覧</strong>を確認できるほか、部署の追加もできます。
          名称変更と削除は、この章で説明したユーザー管理の <Ui>部署管理</Ui> だけで行えます。
        </p>
      </Section>

      <PrevNext href={HREF} />
    </article>
  );
}
