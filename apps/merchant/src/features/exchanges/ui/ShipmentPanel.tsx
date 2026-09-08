"use client";

import { useState, useTransition } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruck, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { SHIPMENT_CARRIER_LABELS } from "@correcre/lib/shipment/tracking";
import { SHIPMENT_CARRIERS } from "@correcre/types";

import { updateShipment } from "../api/client";
import type { ExchangeDetail as ExchangeDetailType, ShipmentInputRequest } from "../model/types";

// 送り状番号は「入れてもらえたらありがたい」情報であって、発送済みに進めるための条件ではない。
// 必須にすると、入力を面倒がった交換が「実物は配送中なのに画面は準備中」で止まってしまう。
// どの画面でも必須には見せないこと。
const OPTIONAL_NOTE =
  "登録しておくと、申請者が自分で配送状況を確認できます（「まだ届きませんか」の問い合わせが減ります）。未入力のままでも発送済みにできます。";

export type ShipmentDraft = {
  carrier: string;
  carrierName: string;
  trackingNumber: string;
};

export const EMPTY_SHIPMENT_DRAFT: ShipmentDraft = {
  carrier: "",
  carrierName: "",
  trackingNumber: "",
};

export function toShipmentRequest(draft: ShipmentDraft): ShipmentInputRequest | undefined {
  const carrier = draft.carrier.trim();
  const trackingNumber = draft.trackingNumber.trim();
  if (!carrier && !trackingNumber) return undefined;
  return {
    carrier: carrier || undefined,
    carrierName: draft.carrierName.trim() || undefined,
    trackingNumber: trackingNumber || undefined,
  };
}

function ShipmentFields({
  draft,
  onChange,
  disabled,
}: {
  draft: ShipmentDraft;
  onChange: (next: ShipmentDraft) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <TextField
        select
        label="配送会社（任意）"
        size="small"
        fullWidth
        value={draft.carrier}
        disabled={disabled}
        onChange={(event) => onChange({ ...draft, carrier: event.target.value })}
      >
        <MenuItem value="">未選択</MenuItem>
        {SHIPMENT_CARRIERS.map((carrier) => (
          <MenuItem key={carrier} value={carrier}>
            {SHIPMENT_CARRIER_LABELS[carrier]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="送り状番号（任意）"
        size="small"
        fullWidth
        placeholder="1234-5678-9012"
        helperText="ハイフンは入れても入れなくても構いません"
        value={draft.trackingNumber}
        disabled={disabled}
        onChange={(event) => onChange({ ...draft, trackingNumber: event.target.value })}
      />

      {draft.carrier === "OTHER" ? (
        <TextField
          label="配送会社名"
          size="small"
          fullWidth
          placeholder="例: 西濃運輸"
          value={draft.carrierName}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, carrierName: event.target.value })}
        />
      ) : null}
    </div>
  );
}

/** 登録済みの発送情報の表示。追跡ページの URL が作れる会社ならリンクにする。 */
function ShipmentSummary({ detail }: { detail: ExchangeDetailType }) {
  const { shipment, trackingUrl, carrierLabel } = detail;

  if (!shipment?.trackingNumber) {
    return (
      <p className="mt-1 text-sm text-slate-500">
        送り状番号は未登録です。{OPTIONAL_NOTE}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <div className="text-slate-700">
        {carrierLabel ? <span className="font-semibold">{carrierLabel}</span> : null}
        <span className="ml-2 font-mono text-slate-900">{shipment.trackingNumber}</span>
      </div>
      {trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 underline"
        >
          配送状況を確認する
          <FontAwesomeIcon icon={faUpRightFromSquare} className="text-xs" />
        </a>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          この配送会社は追跡ページを自動で開けません。配送会社のサイトで番号を照会してください。
        </p>
      )}
    </div>
  );
}

type Props = {
  detail: ExchangeDetailType;
  // 発送前（準備中）の入力欄。発送済みへの遷移と一緒に送るため、親が状態を持つ。
  draft: ShipmentDraft;
  onDraftChange: (next: ShipmentDraft) => void;
  onUpdated: (detail: ExchangeDetailType) => void;
  disabled?: boolean;
};

export default function ShipmentPanel({ detail, draft, onDraftChange, onUpdated, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<ShipmentDraft>(EMPTY_SHIPMENT_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 発送のない商品（来店受取・サービス）には発送情報の概念がないので出さない。
  if (detail.fulfillmentType !== "SHIPPING") {
    return null;
  }

  const startEditing = () => {
    setEditDraft({
      carrier: detail.shipment?.carrier ?? "",
      carrierName: detail.shipment?.carrierName ?? "",
      trackingNumber: detail.shipment?.trackingNumber ?? "",
    });
    setError(null);
    setNotice(null);
    setEditing(true);
  };

  const handleSave = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const updated = await updateShipment(detail.exchangeId, {
          shipment: toShipmentRequest(editDraft) ?? {},
        });
        onUpdated(updated);
        setEditing(false);
        setNotice("発送情報を更新しました。");
      } catch (err) {
        setError(err instanceof Error ? err.message : "発送情報の更新に失敗しました。");
      }
    });
  };

  // 準備中：発送済みに進めるときに一緒に送る入力欄を出す。
  if (detail.status === "PREPARING") {
    return (
      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faTruck} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">発送情報</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">{OPTIONAL_NOTE}</p>
        <ShipmentFields draft={draft} onChange={onDraftChange} disabled={disabled} />
      </section>
    );
  }

  // 発送済み以降：登録済みの内容を見せ、後からでも追記・修正できるようにする。
  if (detail.status !== "IN_PROGRESS" && detail.status !== "COMPLETED") {
    return null;
  }

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faTruck} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">発送情報</h2>
        </div>
        {detail.status === "IN_PROGRESS" && !editing ? (
          <Button variant="outlined" color="inherit" size="small" className="!rounded-full" onClick={startEditing}>
            {detail.shipment?.trackingNumber ? "修正する" : "送り状番号を登録する"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert severity="error" className="!mt-3">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert severity="success" className="!mt-3">
          {notice}
        </Alert>
      ) : null}

      {editing ? (
        <>
          <ShipmentFields draft={editDraft} onChange={setEditDraft} disabled={pending} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="contained" className="!rounded-full" onClick={handleSave} disabled={pending}>
              保存する
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              className="!rounded-full"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              やめる
            </Button>
          </div>
        </>
      ) : (
        <ShipmentSummary detail={detail} />
      )}
    </section>
  );
}
