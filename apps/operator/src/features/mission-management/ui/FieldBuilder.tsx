"use client";

import { useEffect, useRef } from "react";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

import type { MissionField, MissionFieldType } from "@correcre/types";

type FieldBuilderProps = {
  fields: MissionField[];
  onChange: (fields: MissionField[]) => void;
};

const FIELD_TYPE_OPTIONS: { value: MissionFieldType; label: string }[] = [
  { value: "text", label: "テキスト（1行）" },
  { value: "textarea", label: "テキスト（複数行）" },
  { value: "select", label: "セレクト（単一選択）" },
  { value: "multiSelect", label: "マルチセレクト（複数選択）" },
  { value: "date", label: "日付" },
  { value: "datetime", label: "日時" },
  { value: "number", label: "数値" },
  { value: "image", label: "画像" },
];

const AUTO_FIELD_KEY_PATTERN = /^field_(\d+)$/;

function getNextAutoFieldKeySequence(fields: MissionField[]) {
  return (
    fields.reduce((maxSequence, field) => {
      const match = AUTO_FIELD_KEY_PATTERN.exec(field.key);

      if (!match) {
        return maxSequence;
      }

      return Math.max(maxSequence, Number(match[1]));
    }, 0) + 1
  );
}

function createAutoFieldKey(sequence: number) {
  return `field_${String(sequence).padStart(3, "0")}`;
}

function createEmptyField(order: number, key: string): MissionField {
  return {
    key,
    label: "",
    type: "text",
    required: false,
    order,
  };
}

export default function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
  const nextAutoFieldKeySequenceRef = useRef(getNextAutoFieldKeySequence(fields));

  useEffect(() => {
    nextAutoFieldKeySequenceRef.current = Math.max(
      nextAutoFieldKeySequenceRef.current,
      getNextAutoFieldKeySequence(fields),
    );
  }, [fields]);

  const issueNextAutoFieldKey = () => {
    const key = createAutoFieldKey(nextAutoFieldKeySequenceRef.current);
    nextAutoFieldKeySequenceRef.current += 1;
    return key;
  };

  const handleAdd = () => {
    onChange([...fields, createEmptyField(fields.length + 1, issueNextAutoFieldKey())]);
  };

  const handleRemove = (index: number) => {
    const next = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i + 1 }));
    onChange(next);
  };

  const handleUpdate = (index: number, patch: Partial<MissionField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...fields];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((f, i) => ({ ...f, order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const next = [...fields];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((f, i) => ({ ...f, order: i + 1 })));
  };

  const handleTypeChange = (index: number, type: MissionFieldType) => {
    const patch: Partial<MissionField> = { type };

    // type に応じて不要なプロパティをクリア
    if (type !== "select" && type !== "multiSelect") {
      patch.options = undefined;
      patch.minSelected = undefined;
      patch.maxSelected = undefined;
    }

    if (type !== "text" && type !== "textarea") {
      patch.minLength = undefined;
      patch.maxLength = undefined;
    }

    if (type !== "number") {
      patch.min = undefined;
      patch.max = undefined;
    }

    if (type === "select" || type === "multiSelect") {
      const current = fields[index];
      if (!current.options?.length) {
        patch.options = [""];
      }
    }

    handleUpdate(index, patch);
  };

  const handleOptionsChange = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const options = [...(field.options ?? [])];
    options[optionIndex] = value;
    handleUpdate(fieldIndex, { options });
  };

  const handleAddOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    handleUpdate(fieldIndex, { options: [...(field.options ?? []), ""] });
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const options = (field.options ?? []).filter((_, i) => i !== optionIndex);
    handleUpdate(fieldIndex, { options });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">報告フォーム項目</h3>
        <Button
          size="small"
          startIcon={<FontAwesomeIcon icon={faPlus} />}
          onClick={handleAdd}
          sx={{ textTransform: "none" }}
        >
          フィールド追加
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          フィールドがありません。「フィールド追加」をクリックして追加してください。
        </div>
      ) : null}

      {fields.map((field, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">フィールド {index + 1}</span>
            <div className="flex items-center gap-1">
              <IconButton size="small" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
              </IconButton>
              <IconButton size="small" onClick={() => handleMoveDown(index)} disabled={index === fields.length - 1}>
                <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
              </IconButton>
              <IconButton size="small" onClick={() => handleRemove(index)} color="error">
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
              </IconButton>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <TextField
              label="キー"
              value={field.key}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
              helperText="自動採番された保存用IDです。ラベルを変更しても変わりません。"
            />
            <TextField
              label="ラベル"
              value={field.label}
              onChange={(e) => handleUpdate(index, { label: e.target.value })}
              size="small"
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>タイプ</InputLabel>
              <Select
                value={field.type}
                label="タイプ"
                onChange={(e) => handleTypeChange(index, e.target.value as MissionFieldType)}
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              label="プレースホルダ"
              value={field.placeholder ?? ""}
              onChange={(e) => handleUpdate(index, { placeholder: e.target.value || undefined })}
              size="small"
              fullWidth
            />
            <TextField
              label="ヘルプテキスト"
              value={field.helpText ?? ""}
              onChange={(e) => handleUpdate(index, { helpText: e.target.value || undefined })}
              size="small"
              fullWidth
            />
          </div>

          <FormControlLabel
            control={
              <Checkbox
                checked={field.required}
                onChange={(e) => handleUpdate(index, { required: e.target.checked })}
                size="small"
              />
            }
            label="必須"
          />

          {/* テキスト系の文字数制限 */}
          {(field.type === "text" || field.type === "textarea") ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="最小文字数"
                type="number"
                value={field.minLength ?? ""}
                onChange={(e) => handleUpdate(index, { minLength: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                fullWidth
              />
              <TextField
                label="最大文字数"
                type="number"
                value={field.maxLength ?? ""}
                onChange={(e) => handleUpdate(index, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                fullWidth
              />
            </div>
          ) : null}

          {/* 数値の範囲 */}
          {field.type === "number" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="最小値"
                type="number"
                value={field.min ?? ""}
                onChange={(e) => handleUpdate(index, { min: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                fullWidth
              />
              <TextField
                label="最大値"
                type="number"
                value={field.max ?? ""}
                onChange={(e) => handleUpdate(index, { max: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                fullWidth
              />
            </div>
          ) : null}

          {/* セレクト系の選択肢 */}
          {(field.type === "select" || field.type === "multiSelect") ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-600">選択肢</div>
              {(field.options ?? []).map((option, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <TextField
                    value={option}
                    onChange={(e) => handleOptionsChange(index, optIdx, e.target.value)}
                    size="small"
                    fullWidth
                    placeholder={`選択肢 ${optIdx + 1}`}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveOption(index, optIdx)}
                    color="error"
                    disabled={(field.options?.length ?? 0) <= 1}
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </IconButton>
                </div>
              ))}
              <Button
                size="small"
                startIcon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => handleAddOption(index)}
                sx={{ textTransform: "none" }}
              >
                選択肢を追加
              </Button>

              {field.type === "multiSelect" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="最小選択数"
                    type="number"
                    value={field.minSelected ?? ""}
                    onChange={(e) => handleUpdate(index, { minSelected: e.target.value ? Number(e.target.value) : undefined })}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="最大選択数"
                    type="number"
                    value={field.maxSelected ?? ""}
                    onChange={(e) => handleUpdate(index, { maxSelected: e.target.value ? Number(e.target.value) : undefined })}
                    size="small"
                    fullWidth
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
