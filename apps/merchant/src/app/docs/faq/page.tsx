import type { Metadata } from "next";

import { ChapterHeader, DocLink, PrevNext, Section, StatusChip, Ui } from "../_components/content";

export const metadata: Metadata = { title: "よくある質問" };

const HREF = "/docs/faq";

type Faq = { q: string; a: React.ReactNode };

const GROUPS: { title: string; id: string; items: Faq[] }[] = [
  {
    title: "登録・ログイン",
    id: "login",
    items: [
      {
        q: "登録申請をしたのに、招待メールが届きません。",
        a: (
          <>
            運用者の審査が終わるまで、招待メールは届きません。数日たっても届かない場合は、迷惑メールフォルダをご確認のうえ、コレクレ運営にお問い合わせください。
          </>
        ),
      },
      {
        q: "仮パスワードでログインできません。",
        a: (
          <>
            仮パスワードの有効期限（メール受信から 7 日間）が切れている可能性があります。運用者に招待メールの再送をご依頼ください。
            コピーして貼り付けるときに、前後に空白が入っていないかもご確認ください。
          </>
        ),
      },
      {
        q: "新しいパスワードが設定できません。",
        a: (
          <>
            パスワードは<strong>半角の英字と数字だけで 8 文字以上</strong>にしてください。記号（! や @ など）や全角文字は使えません。
          </>
        ),
      },
      {
        q: "作業中に、急にログイン画面に戻りました。",
        a: (
          <>
            安全のため、30 分ほど操作がないと自動でログアウトされます。もう一度ログインしてください。長い入力をするときは、こまめに保存するのがおすすめです（
            <DocLink href="/docs/login#login">くわしく</DocLink>）。
          </>
        ),
      },
      {
        q: "パスワードを忘れました。",
        a: (
          <>
            ログイン画面の「パスワードを忘れた方は こちら」から、ご自身で再設定できます（<DocLink href="/docs/login#forgot">手順</DocLink>）。
          </>
        ),
      },
      {
        q: "メニューに「収支・精算」「会社情報」「ユーザー管理」が表示されません。",
        a: <>これらは管理者だけに表示される画面です。必要な場合は、社内の管理者か運用者にご相談ください。</>,
      },
    ],
  },
  {
    title: "商品・サービス",
    id: "merchandise",
    items: [
      {
        q: "登録した商品が、申請者の画面に表示されません。",
        a: (
          <>
            商品が「下書き」や「非公開」になっていないか、<Ui>商品・サービス管理</Ui> の一覧で確認してください。<strong>「公開中」</strong>の商品だけが表示されます。
          </>
        ),
      },
      {
        q: "必要ポイント数を自分で決められますか？",
        a: <>決められません。価格を入力すると、価格 ÷ 5（端数切り上げ）で自動計算されます。1 ポイント ＝ 5 円です。</>,
      },
      {
        q: "価格には送料を含めますか？",
        a: <>はい。価格は<strong>税・送料・出張費などをすべて含んだ金額</strong>を入力してください。申請者が追加でお支払いすることはありません。</>,
      },
      {
        q: "画像がアップロードできません。",
        a: (
          <>
            JPEG・PNG・WebP 形式で、1 枚 10MB 以下の画像を選んでください。iPhone で撮った写真（HEIC 形式）は、JPEG に変換してからお使いください。
            「アップロード可能な時間を過ぎました」と出た場合は、もう一度画像を選び直してください。
          </>
        ),
      },
      {
        q: "一時的に交換を止めたいです。",
        a: <>商品を削除せずに <Ui>非公開にする</Ui> を押してください。再開するときは <Ui>公開する</Ui> を押すだけです。</>,
      },
    ],
  },
  {
    title: "交換・発送",
    id: "exchange",
    items: [
      {
        q: "交換申請が届いたことは、どうやって分かりますか？",
        a: (
          <>
            「【コレクレ】商品・サービス交換申請のご確認依頼」というメールが届きます。ダッシュボードのやることリストにも表示されます。
          </>
        ),
      },
      {
        q: "間違えて承認（または発送済みに）してしまいました。",
        a: (
          <>
            <StatusChip status="対応中" /> から <StatusChip status="準備中" /> へは、<Ui>準備中に戻す</Ui> で戻せます。
            <StatusChip status="準備中" /> から <StatusChip status="申請中" /> には戻せないため、そのまま進めて問題ないか確認のうえ、必要なら
            <DocLink href="/docs/support">運用者に問い合わせ</DocLink>てください。
          </>
        ),
      },
      {
        q: "完了にした交換を取り消したいです。",
        a: <>提携企業の画面からは取り消せません。運用者にお問い合わせください（カテゴリ「交換管理」）。</>,
      },
      {
        q: "送り状番号は必ず入力しないといけませんか？",
        a: (
          <>
            任意です。入力しなくても <Ui>発送済みにする</Ui> を押せます。ただ、入力しておくと申請者が自分で配送状況を確認でき、問い合わせが減ります。
          </>
        ),
      },
      {
        q: "在庫切れで商品を用意できません。",
        a: (
          <>
            交換詳細の画面で <Ui>却下する</Ui>（準備中なら <Ui>強制キャンセルする</Ui>）を押してください。ポイントは申請者に返されます。
            あわせて、商品を <Ui>非公開にする</Ui> にしておくと、新しい申請が届かなくなります。
          </>
        ),
      },
      {
        q: "お届け日の候補が出てきません。",
        a: (
          <>
            商品の「発送できる曜日」が選ばれていない、または休業日で候補が埋まっている可能性があります。商品の設定と
            <DocLink href="/docs/calendar">休業日カレンダー</DocLink>をご確認ください。候補日は手で追加することもできます。
          </>
        ),
      },
    ],
  },
  {
    title: "請求・精算",
    id: "billing",
    items: [
      {
        q: "今月分の請求メールが送れません。",
        a: <>請求は月単位のため、今月分は月が終わってから（翌月になってから）送信できます。</>,
      },
      {
        q: "請求メールを送ったあとに金額の誤りに気づきました。",
        a: <>送信済みの月は画面から送り直せません。運用者にお問い合わせください（カテゴリ「請求・精算」）。</>,
      },
    ],
  },
];

export default function FaqDocPage() {
  return (
    <article>
      <ChapterHeader
        href={HREF}
        lead={
          <>
            よくいただく質問と、その答えをまとめました。ここで解決しない場合は、<DocLink href="/docs/support">運用者への問い合わせ</DocLink> をご利用ください。
          </>
        }
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#${group.id}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-800"
          >
            {group.title}
          </a>
        ))}
      </div>

      {GROUPS.map((group) => (
        <Section key={group.id} id={group.id} title={group.title}>
          <div className="space-y-3">
            {group.items.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                    Q
                  </span>
                  <span className="flex-1 pt-0.5 font-bold text-slate-900">{item.q}</span>
                  <span className="pt-1 text-slate-400 transition group-open:rotate-180">▼</span>
                </summary>
                <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                    A
                  </span>
                  <div className="flex-1 pt-0.5 leading-8 text-slate-700">{item.a}</div>
                </div>
              </details>
            ))}
          </div>
        </Section>
      ))}

      <PrevNext href={HREF} />
    </article>
  );
}
