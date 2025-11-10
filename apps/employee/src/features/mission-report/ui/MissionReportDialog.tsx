"use client";
import SuccessDialog from "@employee/features/mission-report/ui/SuccessDialog"; // 相対パスは配置に応じて調整

import { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Typography, Box } from "@mui/material";
import type { FormConfig, FieldConfig, SubmitPayload } from "../model/types";
import { fetchMissionFormConfig } from "../api/client";
import { toYYYYMMDD, toYYYYMMDDHHmm } from "@correcre/lib";

type MissionReportDialogProps = {
  /** ダイアログの開閉制御（アンマウントはせず open で出し入れ推奨） */
  open: boolean;
  /** キャンセル/送信成功時のクローズハンドラ（親で open=false にする） */
  onClose: () => void;
  /** 送信処理（API連携など）。成功したら onClose まで行う */
  onSubmit: (payload: SubmitPayload) => void | Promise<void>;
  /** 会社ID（SSO/JWT等から取得予定） */
  companyId: string;
  /** 報告対象のミッションID（未選択の瞬間があるため optional） */
  missionId?: string;
  /** 設定取得の外部ローダ（未指定時はローカル定義 FORM_CONFIGS を検索） */
  loader?: (companyId: string, missionId: string) => Promise<FormConfig | null>;
};

/* ----------------------------------------------------------------
 *  select 入出力の型変換ユーティリティ
 *  - UIは文字列しか扱えないため、UI⇄内部値の相互変換をここで集中管理
 * ---------------------------------------------------------------- */

/** 内部値 → UI（文字列） */
const toSelectInputValue = (t: FieldConfig["selectValueType"] | undefined, v: unknown) => {
  if (v === null || v === undefined) {
    return "";
  }
  if (t === "boolean") {
    return String(Boolean(v)); // true/false -> "true"/"false"
  }
  if (t === "number") {
    return v === "" ? "" : String(v); // 123 -> "123"
  }
  return String(v); // 既定は string
};

/** UI（文字列） → 内部値（型に戻す） */
const castFromSelect = (t: FieldConfig["selectValueType"] | undefined, raw: string) => {
  if (t === "boolean") {
    return raw === "true";
  }
  if (t === "number") {
    return raw === "" ? "" : Number(raw);
  }
  return raw; // 既定は string
};

/* ----------------------------------------------------------------
 *  下書き（localStorage）を本機能分まとめて削除
 *  - キー命名: missionReport:${companyId}:${missionId}
 *  - 送信成功時に全ダイアログ分のドラフトを掃除したい要件に対応
 * ---------------------------------------------------------------- */
const clearAllMissionReportDrafts = () => {
  const prefix = "missionReport:";
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      keys.push(k);
    }
  }
  keys.forEach((k) => localStorage.removeItem(k));
};

export default function MissionReportDialog({
  open,
  onClose,
  onSubmit,
  companyId,
  missionId,
  loader = fetchMissionFormConfig,
}: MissionReportDialogProps) {
  /* ---------------- 状態 ---------------- */

  /** ミッションのフォーム設定（null: 未ロード or 未設定） */
  const [config, setConfig] = useState<FormConfig | null>(null);
  /** 設定ロード中フラグ（UIのローディング切り替えに使用） */
  const [loading, setLoading] = useState(false);
  /** 入力値（id -> 値）。localStorage と同期するのはこのオブジェクト */
  const [values, setValues] = useState<Record<string, any>>({});
  /** 二重送信防止やボタン制御用 */
  const [submitting, setSubmitting] = useState(false);
  /** 送信エラー表示用の軽量なメッセージ（実際のエラー詳細は console に出す） */
  const [error, setError] = useState<string | null>(null);
  /** 成功ダイアログの開閉制御 */
  const [successOpen, setSuccessOpen] = useState(false);
  /** 成功ダイアログ表示用のメッセージ */
  const [successMessage, setSuccessMessage] = useState<React.ReactNode>("");

  /** 設定キャッシュ：親がアンマウントするまで Map を維持（open の度に再通信させない） */
  const cacheRef = useRef(new Map<string, FormConfig | null>());
  /** リクエスト連番：最後の読み込みだけを反映するためのレース対策 */
  const requestSeqRef = useRef(0);

  /** 下書き保存用のキー（missionId が未確定なら一切保存/復元しない） */
  const storageKey = useMemo(() => `missionReport:${companyId}:${missionId}`, [companyId, missionId]);

  /** 設定キャッシュ用のキー（companyId:missionId） */
  const configCacheKey = useMemo(() => {
    if (missionId) {
      return `${companyId}:${missionId}`;
    } else {
      return undefined;
    }
  }, [companyId, missionId]);

  /* ---------------- 初期日付のフォーマット（初期値に使用） ---------------- */

  const nowStr = useMemo(() => {
    const d = new Date();
    return { yyyyMMDD: toYYYYMMDD(d), yyyyMMDDHHmm: toYYYYMMDDHHmm(d) };
  }, []);

  /** 設定から初期値オブジェクトを生成
   *  - date/datetime は「今」を便利値として採用
   *  - それ以外は defaultValue があれば使い、なければ空文字
   */
  const makeInitValues = useMemo(
    () => (cfg: FormConfig) => {
      const init: Record<string, any> = {};
      for (const f of cfg.fields) {
        if (f.type === "datetime-local") {
          init[f.id] = nowStr.yyyyMMDDHHmm;
          continue;
        }
        if (f.type === "date") {
          init[f.id] = nowStr.yyyyMMDD;
          continue;
        }
        init[f.id] = f.defaultValue ?? "";
      }
      return init;
    },
    [nowStr]
  );

  /* ----------------------------------------------------------------
   * 設定ロード（ローカル配列 or 外部ローダ）
   *  - open & missionId が揃った時だけ動く
   *  - まずキャッシュを確認、なければロード
   *  - requestSeq で「最後のレスポンスだけ反映」を保証（A→B→A の順で返る事故防止）
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!open || !missionId || !configCacheKey) {
      return;
    }

    // キャッシュ命中なら即反映（APIを叩かない）
    const cached = cacheRef.current.get(configCacheKey);
    if (cached !== undefined) {
      setConfig(cached);
      setLoading(false);
      return;
    }

    let mounted = true;
    const mySeq = ++requestSeqRef.current;
    setLoading(true);

    (async () => {
      try {
        const cfg = await loader(companyId, missionId);
        // 成否に関わらず結果をキャッシュ（null もキャッシュ）
        cacheRef.current.set(configCacheKey, cfg);

        // まだ mounted かつ「自分が最後の要求」だけ反映
        if (mounted && mySeq === requestSeqRef.current) {
          setConfig(cfg);
          setLoading(false);
        }
      } catch {
        // 失敗も null としてキャッシュ（次回以降も無駄なコールを避ける）
        cacheRef.current.set(configCacheKey, null);
        if (mounted && mySeq === requestSeqRef.current) {
          setConfig(null);
          setLoading(false);
        }
      }
    })();

    // アンマウント時にフラグを折る（ステート更新の安全ガード）
    return () => {
      mounted = false;
    };
  }, [open, companyId, missionId, loader, configCacheKey]);

  /* ----------------------------------------------------------------
   * フォーム初期化（config の変化に追従）
   *  - localStorage に下書きがあれば復元
   *  - なければ makeInitValues で初期化
   *  - ※ 初期化直後の保存は、handleChange 時の setItem で自然に同期される
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!config) {
      return;
    }

    // 1) 下書き復元
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setValues(JSON.parse(raw));
        return;
      } catch {
        // 破損時は握りつぶして初期化へフォールバック
      }
    }

    // 2) デフォルト初期化
    setValues(makeInitValues(config));
  }, [config, storageKey, makeInitValues]);

  /* ----------------------------------------------------------------
   * 入力値の標準化（TextField onChange から受け取った raw を型に合わせる）
   *  - number: 空文字はそのまま ""（入力中の NaN を避ける）。送信時に null へ寄せる
   *  - text/textarea/url: 常に string
   *  - date/datetime: ここでは文字列のまま（送信時にAPI仕様へ変換）
   * ---------------------------------------------------------------- */
  const fmtValue = (f: FieldConfig, raw: unknown) => {
    if (f.type === "number") {
      return raw === "" || raw === undefined ? "" : Number(raw);
    }
    if (f.type === "text" || f.type === "textarea" || f.type === "url") {
      return String(raw ?? "");
    }
    if (f.type === "select") {
      // TextField(select) の onChange は常に string を返すため、実型へキャスト
      return castFromSelect(f.selectValueType, String(raw ?? ""));
    }
    // select/date/datetime などはそのまま返す
    return raw;
  };

  /** 単一フィールドの変更ハンドラ（localStorage に常時ミラー） */
  const handleChange = (f: FieldConfig) => (e: any) => {
    const v = fmtValue(f, e.target.value);
    const newValues = { ...values, [f.id]: v };
    setValues(newValues);
    // ここでミラーしておくことで「開いて入力」→「閉じても下書き残る」を保証
    localStorage.setItem(storageKey, JSON.stringify(newValues));
  };

  /* ----------------------------------------------------------------
   * 送信処理
   *  - config に定義された各フィールドの type に基づいて values を整形
   *  - number 空→null、date/datetime を toYYYYMMDD/HHmm で正規化
   *  - 成功時：当機能の全ドラフト削除 & UI初期化 & onClose
   * ---------------------------------------------------------------- */
  const handleSubmit = async () => {
    if (!config) {
      return;
    }
    setSubmitting(true);
    setError(null);

    const sanitized: Record<string, any> = {};
    try {
      for (const f of config.fields) {
        const raw = values[f.id];

        if (f.type === "date") {
          sanitized[f.id] = raw ? toYYYYMMDD(new Date(raw)) : null;
          continue;
        }
        if (f.type === "datetime-local") {
          sanitized[f.id] = raw ? toYYYYMMDDHHmm(new Date(raw)) : null;
          continue;
        }
        // number の空文字は入力中の表現なので送信時に null へ寄せるのが好ましい
        if (f.type === "number") {
          sanitized[f.id] = raw === "" || raw === undefined ? null : Number(raw);
          continue;
        }

        // text/textarea/url/select などはそのまま（undefined は空文字へ）
        sanitized[f.id] = raw ?? "";
      }

      await onSubmit({ missionId: config.missionId, values: sanitized, points: config.points });

      // 成功後：この機能のドラフト（missionReport: プレフィックス）を全削除
      clearAllMissionReportDrafts();

      setSuccessMessage(
        <>
          「<strong>{config.title}</strong>」の報告を受け付けました。ありがとうございました。
        </>
      );
      setSuccessOpen(true);
      onClose(); // 元ダイアログは閉じる（親で open=false）

      // UI 上の入力も初期化（date/datetime は「今」に戻る）
      setValues(makeInitValues(config));

      // ダイアログを閉じる（親が open=false にする想定）
      onClose();
    } catch {
      // ユーザー向けの軽量メッセージ（詳細は開発者ツール）
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        // paperProps は非推奨のため slotProps.paper.sx を使用
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5,
            },
          },
        }}
      >
        {loading ? (
          <>
            <DialogTitle>読み込み中…</DialogTitle>
            <DialogContent>フォーム設定を取得しています。</DialogContent>
            <DialogActions>
              <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
          </>
        ) : !config ? (
          <>
            <DialogTitle>フォーム未設定</DialogTitle>
            <DialogContent>このミッションの報告フォームが未設定です。管理者に連絡してください。</DialogContent>
            <DialogActions>
              <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* 動的フィールド群：type ごとにレンダリング */}
                {config.fields.map((f) => {
                  if (f.type === "select") {
                    const svt = f.selectValueType;
                    return (
                      <TextField
                        key={f.id}
                        // id を合わせることで label for の Issue を回避できる（MUIは自動採番だが安全のため）
                        id={f.id}
                        select
                        label={f.label}
                        value={toSelectInputValue(svt, values[f.id] ?? "")}
                        onChange={handleChange(f)}
                        required={f.required}
                        fullWidth
                      >
                        {(f.options ?? []).map((opt) => (
                          <MenuItem key={opt.value} value={toSelectInputValue(svt, opt.value)}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    );
                  }

                  if (f.type === "text") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="text"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "textarea") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        multiline
                        minRows={f.rows ?? 3}
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "number") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="number"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  if (f.type === "datetime-local" || f.type === "date") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type={f.type}
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        required={f.required}
                        fullWidth
                        slotProps={{
                          input: {
                            sx: {
                              // モバイル/タブレットのみ余白、PC(lg+)は0
                              py: { xs: 1.25, sm: 1.25, md: 1.25, lg: 0, xl: 0 },
                              px: { xs: 1, sm: 1, md: 1, lg: 0, xl: 0 },
                              // datetime-local の右側アイコン対策も同様に
                              pr: { xs: 1.5, sm: 1.5, md: 1.5, lg: 0, xl: 0 },
                            },
                          },
                          // ラベルが値と重ならないよう常に縮小
                          inputLabel: { shrink: true },
                        }}
                      />
                    );
                  }

                  if (f.type === "url") {
                    return (
                      <TextField
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type="url"
                        value={values[f.id] ?? ""}
                        onChange={handleChange(f)}
                        placeholder={f.placeholder}
                        fullWidth
                        required={f.required}
                      />
                    );
                  }

                  // 既定：text として扱う
                  return (
                    <TextField
                      key={f.id}
                      id={f.id}
                      label={f.label}
                      type="text"
                      value={values[f.id] ?? ""}
                      onChange={handleChange(f)}
                      placeholder={f.placeholder}
                      fullWidth
                      required={f.required}
                    />
                  );
                })}

                {/* Points 表示（左右に振り分け、丸角の背景で視認性UP） */}
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "action.hover",
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography component="span">獲得点数</Typography>
                  <Typography component="span" fontWeight="bold">
                    {config.points}点
                  </Typography>
                </Box>

                {/* 送信エラー時のメッセージ（軽量） */}
                {error && (
                  <Typography variant="body2" color="error">
                    {error}
                  </Typography>
                )}
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} disabled={submitting}>
                キャンセル
              </Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                報告する
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <SuccessDialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="送信完了"
        message={successMessage}
        autoCloseMs={0} // 自動クローズしないなら 0/未指定。自動で閉じたければ 1500 など
        maxWidth="xs"
      />
    </>
  );
}
