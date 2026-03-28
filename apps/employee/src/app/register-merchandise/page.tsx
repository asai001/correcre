"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  Checkbox,
} from "@mui/material";

const deliveryMethodOptions = ["来店", "出張", "発送", "オンライン"];
const genreOptions = ["健康・美容", "日用品・生活雑貨", "服飾", "記念", "食品", "その他"];

type StoreAddressMode = "same_company" | "no_store" | "other";
type ImageTarget = "card" | "detail";

type FormNotice = {
  severity: "success" | "error";
  message: string;
};

type MerchandiseFormValues = {
  partnerEmail: string;
  companyName: string;
  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  bankTransferAccount: string;
  paymentCycle: string;
  publishDate: string;
  heading: string;
  merchandiseName: string;
  serviceDescription: string;
  price: string;
  deliveryMethods: string[];
  serviceArea: string;
  genre: string;
  genreOther: string;
};

function getInitialFormValues(): MerchandiseFormValues {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  return {
    partnerEmail: "",
    companyName: "",
    companyLocation: "",
    storeAddressMode: "same_company",
    storeAddressOther: "",
    customerInquiryContact: "",
    contactPersonName: "",
    contactPersonPhone: "",
    bankTransferAccount: "",
    paymentCycle: "",
    publishDate: localDate,
    heading: "",
    merchandiseName: "",
    serviceDescription: "",
    price: "",
    deliveryMethods: ["発送"],
    serviceArea: "",
    genre: "食品",
    genreOther: "",
  };
}

function FormSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <Paper elevation={0} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <Typography variant="h6" className="font-semibold text-slate-900">
          {title}
        </Typography>
        <Typography variant="body2" className="mt-1 text-slate-500">
          {description}
        </Typography>
      </div>
      {children}
    </Paper>
  );
}

function PreviewRow({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-slate-300 last:border-b-0 md:grid-cols-[124px_minmax(0,1fr)]">
      <div className="border-r border-slate-300 bg-white px-3 py-4 text-base font-semibold text-slate-900">{label}</div>
      <div className="bg-white px-4 py-4 text-base leading-8 text-slate-700">{children}</div>
    </div>
  );
}

export default function RegisterMerchandisePage() {
  const [formValues, setFormValues] = useState<MerchandiseFormValues>(getInitialFormValues);
  const [cardImagePreviewUrl, setCardImagePreviewUrl] = useState<string | null>(null);
  const [detailImagePreviewUrl, setDetailImagePreviewUrl] = useState<string | null>(null);
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [cardImageName, setCardImageName] = useState("");
  const [detailImageName, setDetailImageName] = useState("");
  const [cardFileInputKey, setCardFileInputKey] = useState(0);
  const [detailFileInputKey, setDetailFileInputKey] = useState(0);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (cardImagePreviewUrl) {
        URL.revokeObjectURL(cardImagePreviewUrl);
      }
      if (detailImagePreviewUrl) {
        URL.revokeObjectURL(detailImagePreviewUrl);
      }
    };
  }, [cardImagePreviewUrl, detailImagePreviewUrl]);

  const handleFieldChange =
    (field: keyof MerchandiseFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleDeliveryMethodToggle =
    (method: string) => (event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setFormValues((prev) => ({
        ...prev,
        deliveryMethods: checked ? [...prev.deliveryMethods, method] : prev.deliveryMethods.filter((item) => item !== method),
      }));
    };

  const handleStoreAddressModeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({
      ...prev,
      storeAddressMode: event.target.value as StoreAddressMode,
    }));
  };

  const handleImageChange = (target: ImageTarget) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      if (target === "card") {
        setCardImageFile(null);
        setCardImageName("");
        setCardImagePreviewUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
      } else {
        setDetailImageFile(null);
        setDetailImageName("");
        setDetailImagePreviewUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
      }
      return;
    }

    const nextUrl = URL.createObjectURL(file);

    if (target === "card") {
      setCardImageFile(file);
      setCardImageName(file.name);
      setCardImagePreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return nextUrl;
      });
    } else {
      setDetailImageFile(file);
      setDetailImageName(file.name);
      setDetailImagePreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return nextUrl;
      });
    }
  };

  const handleReset = () => {
    setFormValues(getInitialFormValues());
    setCardImageFile(null);
    setDetailImageFile(null);
    setCardImageName("");
    setDetailImageName("");
    setNotice(null);
    setCardFileInputKey((prev) => prev + 1);
    setDetailFileInputKey((prev) => prev + 1);
    setCardImagePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setDetailImagePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    if (formValues.deliveryMethods.length === 0) {
      setNotice({ severity: "error", message: "提供方法を1つ以上選択してください。" });
      return;
    }

    const payload = new FormData();
    payload.append("partnerEmail", formValues.partnerEmail);
    payload.append("companyName", formValues.companyName);
    payload.append("companyLocation", formValues.companyLocation);
    payload.append("storeAddressMode", formValues.storeAddressMode);
    payload.append("storeAddressOther", formValues.storeAddressOther);
    payload.append("customerInquiryContact", formValues.customerInquiryContact);
    payload.append("contactPersonName", formValues.contactPersonName);
    payload.append("contactPersonPhone", formValues.contactPersonPhone);
    payload.append("bankTransferAccount", formValues.bankTransferAccount);
    payload.append("paymentCycle", formValues.paymentCycle);
    payload.append("heading", formValues.heading);
    payload.append("merchandiseName", formValues.merchandiseName);
    payload.append("serviceDescription", formValues.serviceDescription);
    payload.append("price", formValues.price);
    payload.append("serviceArea", formValues.serviceArea);
    payload.append("genre", formValues.genre);
    payload.append("genreOther", formValues.genreOther);
    formValues.deliveryMethods.forEach((deliveryMethod) => {
      payload.append("deliveryMethods", deliveryMethod);
    });
    if (cardImageFile) {
      payload.append("cardImage", cardImageFile);
    }
    if (detailImageFile) {
      payload.append("detailImage", detailImageFile);
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/register-merchandise", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || "スプレッドシート登録に失敗しました。");
      }

      setNotice({
        severity: "success",
        message: "商品・サービス情報を登録しました。",
      });
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "スプレッドシート登録に失敗しました。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const headingPreview = formValues.heading || "見出し";
  const merchandiseName = formValues.merchandiseName || "商品・サービス名";
  const providerName = formValues.companyName || "御社名";
  const previewTitle = `${headingPreview} | ${providerName}`;
  const necessaryPointsValue = formValues.price ? Number(formValues.price) / 5 : null;
  const necessaryPointsLabel =
    necessaryPointsValue !== null && Number.isFinite(necessaryPointsValue)
      ? `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(necessaryPointsValue)}pt`
      : "未設定";
  const areaSummary = formValues.serviceArea.trim() || "未設定";
  const deliveryMethodSummary = formValues.deliveryMethods.length > 0 ? formValues.deliveryMethods.join("、") : "未設定";
  const descriptionPreview = formValues.serviceDescription.trim() || "商品の特徴や利用シーンが伝わる説明文を入力してください。";
  const genreLabel = formValues.genre === "その他" ? formValues.genreOther.trim() || "その他" : formValues.genre;
  const publishYear = formValues.publishDate ? formValues.publishDate.slice(0, 4) : "----";
  const publishMonthDay = formValues.publishDate ? formValues.publishDate.slice(5).replace("-", "/") : "--/--";
  const publishFullDate = formValues.publishDate
    ? `${formValues.publishDate.slice(0, 4)}年${Number(formValues.publishDate.slice(5, 7))}月${Number(formValues.publishDate.slice(8, 10))}日`
    : "未設定";

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Paper elevation={0} className="overflow-hidden rounded-[32px] border border-slate-200 shadow-sm">
          <div className="bg-[#083f56] px-6 py-7 text-white sm:px-8">
            <Typography variant="overline" className="tracking-[0.32em] text-white/70">
              EMPLOYEE
            </Typography>
            <Typography variant="h4" className="mt-2 text-2xl font-bold sm:text-4xl">
              商品・サービス登録
            </Typography>
            <Typography variant="body1" className="mt-3 leading-7 text-white/80">
              商品交換ページと詳細ページの両方で使う情報をまとめて入力できます。画像、価格、提供方法、対応エリアまでこの画面で整えてください。
            </Typography>
          </div>

          <div className="grid gap-6 bg-[linear-gradient(180deg,#f8fbfc_0%,#f3f6f8_100%)] p-4 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <div className="space-y-4">
              <Typography variant="body2" className="text-sm leading-6 text-slate-600 sm:hidden">
                画面下部でプレビューの確認ができます。
              </Typography>
              <Box
                id="register-merchandise-form"
                component="form"
                onSubmit={handleSubmit}
                onReset={handleReset}
                className="space-y-6"
              >
                {notice && <Alert severity={notice.severity}>{notice.message}</Alert>}

                <FormSection title="提携企業情報" description="提携企業の連絡先と掲載元情報を入力します。">
                <div className="grid gap-5 md:grid-cols-2">
                  <TextField
                    label="メールアドレス"
                    type="email"
                    value={formValues.partnerEmail}
                    onChange={handleFieldChange("partnerEmail")}
                    required
                    fullWidth
                    placeholder="info@example.co.jp"
                  />
                  <TextField
                    label="御社名"
                    value={formValues.companyName}
                    onChange={handleFieldChange("companyName")}
                    required
                    fullWidth
                    placeholder="株式会社and LIFE"
                  />
                </div>
                <div className="mt-5 grid gap-5">
                  <TextField
                    label="会社所在地"
                    value={formValues.companyLocation}
                    onChange={handleFieldChange("companyLocation")}
                    required
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="愛知県名古屋市..."
                  />
                  <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
                    <Typography variant="subtitle2" className="text-slate-800">
                      店舗住所（表示用）
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-slate-500">
                      一覧や詳細に表示する店舗住所の扱いを選択してください。
                    </Typography>
                    <RadioGroup value={formValues.storeAddressMode} onChange={handleStoreAddressModeChange} className="mt-3">
                      <FormControlLabel value="same_company" control={<Radio size="small" />} label="会社と同じ" />
                      <FormControlLabel value="no_store" control={<Radio size="small" />} label="店舗無し" />
                      <FormControlLabel value="other" control={<Radio size="small" />} label="その他" />
                    </RadioGroup>
                    {formValues.storeAddressMode === "other" && (
                      <TextField
                        label="店舗住所（表示用）"
                        value={formValues.storeAddressOther}
                        onChange={handleFieldChange("storeAddressOther")}
                        required
                        fullWidth
                        multiline
                        minRows={2}
                        className="mt-3"
                        placeholder="表示したい店舗住所を入力してください"
                      />
                    )}
                  </FormControl>
                  <TextField
                    label="お客様からの問い合わせ先"
                    value={formValues.customerInquiryContact}
                    onChange={handleFieldChange("customerInquiryContact")}
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="電話番号、メールアドレス、受付時間など"
                  />
                </div>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <TextField
                    label="担当者様名"
                    value={formValues.contactPersonName}
                    onChange={handleFieldChange("contactPersonName")}
                    required
                    fullWidth
                    placeholder="山田 太郎"
                  />
                  <TextField
                    label="担当者様電話番号"
                    value={formValues.contactPersonPhone}
                    onChange={handleFieldChange("contactPersonPhone")}
                    required
                    fullWidth
                    placeholder="090-1234-5678"
                  />
                </div>
                <div className="mt-6 grid gap-5">
                  <TextField
                    label="お振込み先"
                    value={formValues.bankTransferAccount}
                    onChange={handleFieldChange("bankTransferAccount")}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="銀行名、支店名、口座種別、口座番号、口座名義"
                  />
                  <div className="grid gap-2">
                    <TextField
                      label="入金サイクル"
                      value={formValues.paymentCycle}
                      onChange={handleFieldChange("paymentCycle")}
                      fullWidth
                      placeholder="例：20日締め翌月15日払い"
                    />
                    <Typography variant="body2" className="text-slate-500">
                      ※ベースは月末締め翌月末払いです。それ以外をご希望の場合のみ入力してください。
                    </Typography>
                  </div>
                </div>
              </FormSection>

              <FormSection title="商品・サービス情報" description="商品・サービスの見出し、内容、価格、提供方法などを入力します。">
                <Stack spacing={2.5}>
                  <TextField
                    label="見出し"
                    value={formValues.heading}
                    onChange={handleFieldChange("heading")}
                    required
                    fullWidth
                    placeholder="商品・サービス"
                  />
                  <TextField
                    label="商品・サービス名"
                    value={formValues.merchandiseName}
                    onChange={handleFieldChange("merchandiseName")}
                    required
                    fullWidth
                    placeholder="秀吉のごほうび『生』くりーむぱん 6個入り"
                  />
                  <TextField
                    label="商品・サービス内容"
                    value={formValues.serviceDescription}
                    onChange={handleFieldChange("serviceDescription")}
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="商品の魅力、こだわり、利用シーンなどを入力してください。"
                  />
                  <TextField
                    label="価格（税、送料、出張費等全て込み）"
                    type="number"
                    value={formValues.price}
                    onChange={handleFieldChange("price")}
                    required
                    fullWidth
                    placeholder="10000"
                    slotProps={{ input: { endAdornment: <InputAdornment position="end">円</InputAdornment> } }}
                  />
                  <FormControl className="rounded-2xl border border-slate-200 px-4 py-4">
                    <Typography variant="subtitle2" className="text-slate-800">
                      提供方法
                    </Typography>
                    <FormGroup className="mt-3 grid gap-1 sm:grid-cols-2">
                      {deliveryMethodOptions.map((option) => (
                        <FormControlLabel
                          key={option}
                          control={<Checkbox checked={formValues.deliveryMethods.includes(option)} onChange={handleDeliveryMethodToggle(option)} size="small" />}
                          label={option}
                        />
                      ))}
                    </FormGroup>
                  </FormControl>
                  <TextField
                    label="対応エリア（来店の場合：店舗住所 ｜ 出張・発送の場合：サービス提供地域）"
                    value={formValues.serviceArea}
                    onChange={handleFieldChange("serviceArea")}
                    required
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="名古屋市中村区... / 全国対応 / 東海3県 など"
                  />
                  <TextField select label="ジャンル" value={formValues.genre} onChange={handleFieldChange("genre")} required fullWidth>
                    {genreOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                  {formValues.genre === "その他" && (
                    <TextField
                      label="ジャンル（その他）"
                      value={formValues.genreOther}
                      onChange={handleFieldChange("genreOther")}
                      required
                      fullWidth
                      placeholder="ジャンルを入力してください"
                    />
                  )}
                </Stack>
              </FormSection>

              <FormSection title="提供イメージ" description="一覧カード用と詳細ページ用で別々の画像を設定できます。">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <Typography variant="subtitle2" className="text-slate-800">
                      一覧カード用画像
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-slate-500">
                      jpg / png を1枚選択してください。
                    </Typography>
                    <Button component="label" variant="outlined" className="!mt-4 !rounded-full !px-5">
                      画像を選択
                      <input key={cardFileInputKey} type="file" accept="image/*" hidden onChange={handleImageChange("card")} />
                    </Button>
                    <Typography variant="body2" className="mt-3 text-slate-600">
                      {cardImageName || "まだ画像は選択されていません。"}
                    </Typography>
                    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      {cardImagePreviewUrl ? (
                        <Box component="img" src={cardImagePreviewUrl} alt={previewTitle} className="aspect-[4/3] h-full w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,#d9eef5_0%,#eff6f9_45%,#f8fafc_100%)] px-6 text-center text-sm leading-7 text-slate-500">
                          一覧カードに表示する画像がここに表示されます。
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <Typography variant="subtitle2" className="text-slate-800">
                      詳細ページ用画像
                    </Typography>
                    <Typography variant="body2" className="mt-1 text-slate-500">
                      jpg / png を1枚選択してください。
                    </Typography>
                    <Button component="label" variant="outlined" className="!mt-4 !rounded-full !px-5">
                      画像を選択
                      <input key={detailFileInputKey} type="file" accept="image/*" hidden onChange={handleImageChange("detail")} />
                    </Button>
                    <Typography variant="body2" className="mt-3 text-slate-600">
                      {detailImageName || "まだ画像は選択されていません。"}
                    </Typography>
                    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      {detailImagePreviewUrl ? (
                        <Box component="img" src={detailImagePreviewUrl} alt={previewTitle} className="aspect-[4/3] h-full w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,#d9eef5_0%,#eff6f9_45%,#f8fafc_100%)] px-6 text-center text-sm leading-7 text-slate-500">
                          詳細ページに表示する画像がここに表示されます。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </FormSection>
              </Box>
            </div>

            <div className="xl:sticky xl:top-6 xl:self-start">
              <Stack spacing={3}>
                <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
                  <Typography variant="h6" className="font-semibold text-slate-900">
                    一覧カードプレビュー
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-slate-500">
                    商品交換ページでの見え方です。
                  </Typography>

                  <div className="mt-4 p-0">
                    {cardImagePreviewUrl ? (
                      <Box component="img" src={cardImagePreviewUrl} alt={previewTitle} className="aspect-[16/10] h-full w-full border border-slate-300 object-cover shadow-[0_2px_10px_rgba(15,23,42,0.14)]" />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center border border-slate-300 bg-[linear-gradient(135deg,#e0f0f5_0%,#f8fafc_100%)] px-6 text-center text-sm text-slate-500 shadow-[0_2px_10px_rgba(15,23,42,0.14)]">
                        商品画像プレビュー
                      </div>
                    )}

                    <div className="px-0 pb-1 pt-6">
                      <Typography variant="h6" className="text-[1.4rem] font-bold leading-[1.45] text-slate-900">
                        {previewTitle}
                      </Typography>

                      <div className="mt-5 overflow-hidden border border-[#75afe1] bg-white">
                        <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                          <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">必要ポイント数</div>
                          <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">{necessaryPointsLabel}</div>
                        </div>
                        <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                          <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">対応エリア</div>
                          <div className="flex items-center justify-center px-4 py-3 text-center text-sm text-slate-700">{areaSummary}</div>
                        </div>
                        <div className="grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#75afe1]">
                          <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">提供方法</div>
                          <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">{deliveryMethodSummary}</div>
                        </div>
                      <div className="grid grid-cols-[136px_minmax(0,1fr)]">
                          <div className="bg-[#86bcea] px-4 py-3 text-sm font-semibold text-slate-900">ジャンル</div>
                          <div className="flex items-center justify-center px-4 py-3 text-sm text-slate-700">{genreLabel}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Paper>

                <Paper elevation={0} className="border border-slate-200 bg-white p-5 shadow-sm">
                  <Typography variant="h6" className="font-semibold text-slate-900">
                    詳細ページプレビュー
                  </Typography>
                  <Typography variant="body2" className="mt-1 text-slate-500">
                    個別商品の説明ページでの見え方です。
                  </Typography>

                  <div className="mt-5 grid grid-cols-[72px_minmax(0,1fr)] gap-5">
                    <div className="border-r border-slate-300 text-center">
                      <Typography variant="body2" className="text-sm leading-6 text-slate-500">
                        {publishYear}
                      </Typography>
                      <div className="mt-1 text-lg leading-none text-slate-800">{publishMonthDay}</div>
                    </div>

                    <div>
                      <Typography variant="h6" className="text-[1.2rem] font-bold leading-10 text-slate-900 sm:text-[2rem]">
                        {previewTitle}
                      </Typography>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span>{genreLabel}</span>
                        <span>{publishFullDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 overflow-hidden border border-slate-300">
                    <PreviewRow label="商品・サービス名">{merchandiseName}</PreviewRow>
                    <PreviewRow label="提供会社">{providerName}</PreviewRow>
                    <PreviewRow label="提供イメージ">
                      <div className="overflow-hidden border border-slate-300 bg-white">
                        {detailImagePreviewUrl ? (
                          <Box component="img" src={detailImagePreviewUrl} alt={previewTitle} className="aspect-[4/3] h-full w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(180deg,#eef5f7_0%,#ffffff_100%)] px-6 text-center text-sm text-slate-500">
                            登録した商品画像がここに表示されます。
                          </div>
                        )}
                      </div>
                    </PreviewRow>
                    <PreviewRow label="商品・サービス内容">
                      <p className="whitespace-pre-line">{descriptionPreview}</p>
                    </PreviewRow>
                    <PreviewRow label="必要ポイント数">{necessaryPointsLabel}</PreviewRow>
                    <PreviewRow label="対応エリア">
                      <ul className="list-disc pl-5">
                        <li className="whitespace-pre-line">{areaSummary}</li>
                      </ul>
                    </PreviewRow>
                    <PreviewRow label="提供タイプ">
                      <ul className="list-disc pl-5">
                        {formValues.deliveryMethods.length > 0 ? (
                          formValues.deliveryMethods.map((deliveryMethod) => <li key={deliveryMethod}>{deliveryMethod}</li>)
                        ) : (
                          <li>未設定</li>
                        )}
                      </ul>
                    </PreviewRow>
                    <PreviewRow label="ジャンル">
                      <ul className="list-disc pl-5">
                        <li>{genreLabel}</li>
                      </ul>
                    </PreviewRow>
                  </div>
                </Paper>
              </Stack>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end xl:col-start-1">
              <Button
                type="reset"
                form="register-merchandise-form"
                variant="outlined"
                color="inherit"
                disabled={isSubmitting}
                className="!rounded-full !px-6 !py-3"
              >
                入力をリセット
              </Button>
              <Button
                type="submit"
                form="register-merchandise-form"
                variant="contained"
                disabled={isSubmitting}
                className="!rounded-full !px-7 !py-3"
              >
                {isSubmitting ? "登録中..." : "商品情報を登録"}
              </Button>
            </div>
          </div>
        </Paper>
      </div>
    </div>
  );
}

