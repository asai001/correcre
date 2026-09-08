/** ファイル名に使えない文字を落とす */
export function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "export";
}
