"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPenToSquare, faPlus, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import type { EmployeeDepartmentOption, MutationResult } from "../model/types";

type DepartmentManagementDialogProps = {
  open: boolean;
  departments: EmployeeDepartmentOption[];
  onClose: () => void;
  onCreateDepartment: (name: string) => Promise<MutationResult>;
  onRenameDepartment: (currentName: string, nextName: string) => Promise<MutationResult>;
  onDeleteDepartment: (name: string) => Promise<MutationResult>;
};

export default function DepartmentManagementDialog({
  open,
  departments,
  onClose,
  onCreateDepartment,
  onRenameDepartment,
  onDeleteDepartment,
}: DepartmentManagementDialogProps) {
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartmentName, setEditingDepartmentName] = useState<string | null>(null);
  const [editingDraftName, setEditingDraftName] = useState("");
  const [departmentPendingDeletion, setDepartmentPendingDeletion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setNewDepartmentName("");
    setEditingDepartmentName(null);
    setEditingDraftName("");
    setDepartmentPendingDeletion(null);
    setError(null);
    setBusyKey(null);
  }, [open]);

  const handleCreateDepartment = async () => {
    const name = newDepartmentName.trim();
    if (!name) {
      setError("部署名を入力してください");
      return;
    }

    setBusyKey("create");
    setError(null);
    try {
      const result = await onCreateDepartment(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNewDepartmentName("");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRenameDepartment = async () => {
    if (!editingDepartmentName) {
      return;
    }

    const nextName = editingDraftName.trim();
    if (!nextName) {
      setError("部署名を入力してください");
      return;
    }

    setBusyKey(`rename:${editingDepartmentName}`);
    setError(null);
    try {
      const result = await onRenameDepartment(editingDepartmentName, nextName);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setEditingDepartmentName(null);
      setEditingDraftName("");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteClick = (departmentName: string) => {
    setError(null);
    setDepartmentPendingDeletion(departmentName);
  };

  const handleCloseDeleteDialog = () => {
    if (departmentPendingDeletion && busyKey === `delete:${departmentPendingDeletion}`) {
      return;
    }

    setDepartmentPendingDeletion(null);
  };

  const handleConfirmDeleteDepartment = async () => {
    if (!departmentPendingDeletion) {
      return;
    }

    setBusyKey(`delete:${departmentPendingDeletion}`);
    setError(null);
    try {
      const result = await onDeleteDepartment(departmentPendingDeletion);
      if (!result.ok) {
        setError(result.error);
      }

      setDepartmentPendingDeletion(null);
    } finally {
      setBusyKey(null);
    }
  };

  const deletingDepartmentName = departmentPendingDeletion;
  const isDeleteConfirmationBusy = Boolean(
    deletingDepartmentName && busyKey === `delete:${deletingDepartmentName}`
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={busyKey ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <div className="text-2xl font-bold text-slate-900">部署管理</div>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            部署の追加、名称変更、削除を行います。所属中の従業員がいる部署は削除できません。
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: "8px !important" }}>
          <div className="space-y-4">
            {error && <Alert severity="error">{error}</Alert>}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">部署を追加</div>
              <div className="flex gap-3">
                <TextField
                  size="small"
                  fullWidth
                  label="部署名"
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<FontAwesomeIcon icon={faPlus} />}
                  onClick={handleCreateDepartment}
                  disabled={busyKey === "create"}
                  sx={{ minWidth: 110, borderRadius: "12px", backgroundColor: "#10B981" }}
                >
                  追加
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {departments.map((department) => {
                const isEditing = editingDepartmentName === department.name;
                const isBusy = busyKey === `rename:${department.name}` || busyKey === `delete:${department.name}`;

                return (
                  <div
                    key={department.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        label="部署名"
                        value={editingDraftName}
                        onChange={(event) => setEditingDraftName(event.target.value)}
                      />
                    ) : (
                      <div>
                        <div className="font-semibold text-slate-900">{department.name}</div>
                        <div className="text-sm text-slate-500">{department.employeeCount}名所属</div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <IconButton
                            aria-label="部署名を保存"
                            onClick={handleRenameDepartment}
                            disabled={isBusy}
                            sx={{ color: "#10B981" }}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </IconButton>
                          <IconButton
                            aria-label="編集をキャンセル"
                            onClick={() => {
                              setEditingDepartmentName(null);
                              setEditingDraftName("");
                              setError(null);
                            }}
                            disabled={isBusy}
                            sx={{ color: "#64748B" }}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            aria-label={`${department.name}を編集`}
                            onClick={() => {
                              setEditingDepartmentName(department.name);
                              setEditingDraftName(department.name);
                              setError(null);
                            }}
                            disabled={Boolean(busyKey)}
                            sx={{ color: "#2563EB" }}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </IconButton>
                          <IconButton
                            aria-label={`${department.name}を削除`}
                            onClick={() => handleDeleteClick(department.name)}
                            disabled={Boolean(busyKey)}
                            sx={{ color: "#EF4444" }}
                          >
                            <FontAwesomeIcon icon={faTrashCan} />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {!departments.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  まだ部署が登録されていません。上のフォームから追加してください。
                </div>
              )}
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button onClick={onClose} disabled={Boolean(busyKey)} sx={{ minWidth: 110 }}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deletingDepartmentName)}
        onClose={isDeleteConfirmationBusy ? undefined : handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 0.5,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>部署を削除</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              「{deletingDepartmentName}」を削除しますか？
            </p>
            <p>
              所属中の従業員がいる部署は削除できません。
            </p>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleteConfirmationBusy} sx={{ minWidth: 96 }}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDeleteDepartment}
            disabled={isDeleteConfirmationBusy}
            sx={{
              minWidth: 96,
              borderRadius: "12px",
              backgroundColor: "#EF4444",
              "&:hover": {
                backgroundColor: "#DC2626",
              },
            }}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
