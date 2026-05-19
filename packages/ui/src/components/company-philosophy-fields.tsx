import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Button, Checkbox, FormControlLabel, IconButton, TextField } from "@mui/material";

import type { CompanyPhilosophyItemValidation } from "@correcre/lib/company-management-form";
import type { CompanyPhilosophyItem } from "@correcre/lib/company-management-types";

export type CompanyPhilosophyFieldsProps = {
  items: CompanyPhilosophyItem[];
  validation: CompanyPhilosophyItemValidation[];
  hasSubmitted: boolean;
  onAdd: () => void;
  onChangeItem: (itemId: string, nextItem: Partial<CompanyPhilosophyItem>) => void;
  onRemoveItem: (itemId: string) => void;
};

export default function CompanyPhilosophyFields({
  items,
  validation,
  hasSubmitted,
  onAdd,
  onChangeItem,
  onRemoveItem,
}: CompanyPhilosophyFieldsProps) {
  const dashboardVisibleCount = items.filter((item) => item.displayOnDashboard).length;

  return (
    <div className="space-y-5 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 shadow-inner shadow-white">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">理念体系</h3>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">全 {items.length} 件</span>
          {items.length ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              ダッシュボード表示 {dashboardVisibleCount} 件
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <p className="w-full text-sm leading-7 text-slate-500">
            企業理念、社是、MISSION など、企業ごとに表示したい項目を任意の数だけ追加できます。
          </p>

          <Button
            variant="outlined"
            startIcon={<FontAwesomeIcon icon={faCirclePlus} />}
            onClick={onAdd}
            sx={{
              alignSelf: "flex-start",
              mb: 1.5,
              borderRadius: "999px",
              borderColor: "#22C1DC",
              color: "#0891B2",
              px: 3.25,
              py: 1.1,
              fontWeight: 700,
              backgroundColor: "#FFFFFF",
              whiteSpace: "nowrap",
              boxShadow: "0 8px 18px -14px rgba(6, 182, 212, 0.7)",
              "& .MuiButton-startIcon": {
                ml: 0,
                mr: 1,
              },
              "&:hover": {
                borderColor: "#0891B2",
                backgroundColor: "#ECFEFF",
              },
            }}
          >
            追加
          </Button>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-4">
          {items.map((item, index) => {
            const itemValidation = validation[index] ?? { label: false, content: false };

            return (
              <div
                key={item.id}
                className="rounded-[24px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    {item.displayOnDashboard ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        表示対象
                      </span>
                    ) : null}
                  </div>
                  <IconButton
                    aria-label="理念体系を削除"
                    onClick={() => onRemoveItem(item.id)}
                    size="small"
                    sx={{
                      color: "#DC2626",
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      "&:hover": {
                        backgroundColor: "#FEE2E2",
                      },
                    }}
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </IconButton>
                </div>

                <div className="mt-8 grid gap-8">
                  <div>
                    <TextField
                      label="なにを追加するか"
                      value={item.label}
                      onChange={(event) => onChangeItem(item.id, { label: event.target.value })}
                      fullWidth
                      required
                      size="small"
                      placeholder="例: 企業理念 / 社是 / MISSION / VALUE"
                      error={hasSubmitted && itemValidation.label}
                      helperText={
                        hasSubmitted && itemValidation.label
                          ? "項目名を入力してください。"
                          : "例: 企業理念 / 社是 / MISSION / VALUE"
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "16px",
                          backgroundColor: "#FFFFFF",
                        },
                        "& .MuiFormHelperText-root": {
                          mx: 0.5,
                          mt: 1.25,
                          lineHeight: 1.7,
                        },
                      }}
                    />
                  </div>

                  <div>
                    <TextField
                      value={item.content}
                      onChange={(event) => onChangeItem(item.id, { content: event.target.value })}
                      fullWidth
                      required
                      multiline
                      rows={3}
                      placeholder="どんな内容か"
                      error={hasSubmitted && itemValidation.content}
                      helperText={hasSubmitted && itemValidation.content ? "内容を入力してください。" : "従業員に見せたい文言を入力してください。"}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "18px",
                          alignItems: "flex-start",
                          backgroundColor: "#FFFFFF",
                          pt: 1.25,
                        },
                        "& .MuiInputBase-inputMultiline": {
                          lineHeight: 1.8,
                          resize: "vertical",
                          overflow: "auto",
                        },
                        "& .MuiInputBase-input::placeholder": {
                          color: "#64748B",
                          opacity: 1,
                          transition: "opacity 0.18s ease",
                        },
                        "& .Mui-focused .MuiInputBase-input::placeholder": {
                          opacity: 0,
                        },
                        "& .MuiFormHelperText-root": {
                          mx: 0.5,
                          mt: 1.25,
                          lineHeight: 1.7,
                        },
                      }}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <FormControlLabel
                      sx={{
                        m: 0,
                        alignItems: "flex-start",
                        "& .MuiFormControlLabel-label": {
                          width: "100%",
                        },
                      }}
                      control={
                        <Checkbox
                          checked={item.displayOnDashboard}
                          onChange={(event) =>
                            onChangeItem(item.id, {
                              displayOnDashboard: event.target.checked,
                            })
                          }
                          sx={{
                            mt: 0.25,
                            p: 0.5,
                            color: "#0F766E",
                            "&.Mui-checked": {
                              color: "#0F766E",
                            },
                          }}
                        />
                      }
                      label={
                        <div className="space-y-1 pl-2">
                          <div className="text-sm font-semibold text-slate-800">従業員側画面のダッシュボード上部に表示する</div>
                          <div className="text-xs leading-6 text-slate-500">
                            今後ダッシュボード上部に表示する対象として保持します。
                          </div>
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-8 text-sm leading-7 text-slate-500">
          まだ理念体系は追加されていません。必要な項目だけ追加して保存できます。
        </div>
      )}
    </div>
  );
}
