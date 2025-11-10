import type { PhilosophyPayload } from "../model/types";

export const PHILOSOPHY: PhilosophyPayload = {
  companyId: "em-inc",
  corporatePhilosophy: "そうぞうの力で未来を描く 想像力と創造力で可能性を切り拓き続ける",
  purpose: "中小企業の魅力を引き出し国力を上げる",
  mission: "",
  vision: "",
  values: [
    { title: "Customer First", description: "利用者の体験価値を最優先に設計する" },
    { title: "Ship Fast", description: "小さく速く出して検証し、継続的に改善する" },
    { title: "Ownership", description: "課題を自分ごと化し、最後までやり切る" },
  ],
  creed: ["事実ベースで議論し、仮説検証を怠らない", "仲間を尊重し、透明性高く情報共有する", "セキュリティとプライバシーを最優先で守る"],
  updatedAt: new Date().toISOString(),
};
