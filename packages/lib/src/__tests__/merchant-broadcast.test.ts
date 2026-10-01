import {
  applyMerchantBroadcastPlaceholders,
  buildMerchantBroadcastSubject,
  buildMerchantBroadcastText,
  mergeMerchantBroadcastRecipients,
  resolveMerchantBroadcastRecipients,
} from "../merchant-broadcast";

const merchant = {
  merchantId: "m-001",
  name: "株式会社ぴよ",
  displayName: "ぴよちゃん",
  contactEmail: "Contact@Example.com",
  contactPersonName: "山田 花子",
};

describe("resolveMerchantBroadcastRecipients", () => {
  it("停止・削除済みユーザーを除き、連絡先メールアドレスも宛先に含める", () => {
    const recipients = resolveMerchantBroadcastRecipients(merchant, [
      { email: "active@example.com", lastName: "佐藤", firstName: "太郎", status: "ACTIVE" },
      { email: "invited@example.com", lastName: "鈴木", firstName: "", status: "INVITED" },
      { email: "inactive@example.com", lastName: "田中", firstName: "一郎", status: "INACTIVE" },
      { email: "deleted@example.com", lastName: "高橋", firstName: "次郎", status: "DELETED" },
    ]);

    expect(recipients).toEqual([
      { email: "active@example.com", merchantId: "m-001", merchantName: "ぴよちゃん", recipientName: "佐藤 太郎" },
      { email: "invited@example.com", merchantId: "m-001", merchantName: "ぴよちゃん", recipientName: "鈴木" },
      { email: "contact@example.com", merchantId: "m-001", merchantName: "ぴよちゃん", recipientName: "山田 花子" },
    ]);
  });

  it("連絡先メールアドレスがユーザーと同じなら 1 件にまとめ、ユーザーの氏名を使う", () => {
    const recipients = resolveMerchantBroadcastRecipients(merchant, [
      { email: "contact@example.com", lastName: "佐藤", firstName: "太郎", status: "ACTIVE" },
    ]);

    expect(recipients).toHaveLength(1);
    expect(recipients[0].recipientName).toBe("佐藤 太郎");
  });

  it("氏名が無い場合は「ご担当者」を差し込む", () => {
    const recipients = resolveMerchantBroadcastRecipients(
      { ...merchant, contactPersonName: " " },
      [{ email: "a@example.com", lastName: "", firstName: "", status: "ACTIVE" }],
    );

    expect(recipients.map((recipient) => recipient.recipientName)).toEqual(["ご担当者", "ご担当者"]);
  });
});

describe("mergeMerchantBroadcastRecipients", () => {
  it("複数の提携企業に同じアドレスがある場合は先の提携企業ぶんだけ残す", () => {
    const merged = mergeMerchantBroadcastRecipients([
      [{ email: "a@example.com", merchantId: "m-001", merchantName: "A", recipientName: "甲" }],
      [
        { email: "a@example.com", merchantId: "m-002", merchantName: "B", recipientName: "乙" },
        { email: "b@example.com", merchantId: "m-002", merchantName: "B", recipientName: "丙" },
      ],
    ]);

    expect(merged.map((recipient) => [recipient.email, recipient.merchantId])).toEqual([
      ["a@example.com", "m-001"],
      ["b@example.com", "m-002"],
    ]);
  });
});

describe("差し込み文字と本文の組み立て", () => {
  const recipient = { merchantName: "ぴよちゃん", recipientName: "佐藤 太郎" };

  it("差し込み文字を繰り返し置換する", () => {
    expect(applyMerchantBroadcastPlaceholders("{{提携企業名}} {{担当者名}} 様 / {{提携企業名}}", recipient)).toBe(
      "ぴよちゃん 佐藤 太郎 様 / ぴよちゃん",
    );
  });

  it("件名の改行は空白にする", () => {
    expect(buildMerchantBroadcastSubject({ subject: "【コレクレ】\n{{提携企業名}}様へ\r\n", recipient })).toBe(
      "【コレクレ】 ぴよちゃん様へ",
    );
  });

  it("本文の末尾にフッターと提携企業向け画面の URL を付ける", () => {
    const text = buildMerchantBroadcastText({
      body: "{{担当者名}} 様\n\nお知らせです。\n\n",
      recipient,
      merchantAppUrl: "https://merchant.correcre.jp",
    });

    expect(text.startsWith("佐藤 太郎 様\n\nお知らせです。\n\n――")).toBe(true);
    expect(text).toContain("提携企業向け画面:\nhttps://merchant.correcre.jp");
    expect(text.endsWith("コレクレ 運営事務局")).toBe(true);
  });

  it("URL が無い場合は URL の行を出さない", () => {
    const text = buildMerchantBroadcastText({ body: "本文", recipient });
    expect(text).not.toContain("提携企業向け画面");
  });
});
