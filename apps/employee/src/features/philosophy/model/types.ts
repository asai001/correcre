export type Philosophy = {
  corporatePhilosophy: string;
  purpose: string;
};

export type ValueItem = {
  /** 見出し（例：Customer First） */
  title: string;
  /** 説明文 */
  description?: string;
};

export type PhilosophyPayload = {
  /** 企業ID */
  companyId: string;
  /** 経営理念 */
  corporatePhilosophy: string;
  /** PURPOSE */
  purpose?: string;
  /** MISSION */
  mission?: string;
  /** VISION */
  vision?: string;
  /** VALUES（複数可） */
  values?: ValueItem[];
  /** CREED／行動規範（複数段落可） */
  creed?: string[];
  /** 最終更新日時（ISO） */
  updatedAt?: string;
};
