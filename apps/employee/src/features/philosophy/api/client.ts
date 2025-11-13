import { PHILOSOPHY } from "../model/philosophy.mock";
import type { PhilosophyPayload } from "../model/types";

export async function fetchPhilosophy(companyId: string, missionId: string): Promise<PhilosophyPayload | null> {
  console.log(companyId, missionId);
  await new Promise((r) => setTimeout(r, 20));
  return PHILOSOPHY ?? null;
}
