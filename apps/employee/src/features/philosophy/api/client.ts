import { PHILOSOPHY } from "../model/philosophy.mock";
import type { PhilosophyPayload } from "../model/types";

export async function fetchPhilosophy(
  companyId: string,
  missionId: string,
  opts?: { signal?: AbortSignal }
): Promise<PhilosophyPayload | null> {
  console.log(companyId, missionId, opts);
  await new Promise((r) => setTimeout(r, 20));
  return PHILOSOPHY ?? null;

  // 将来：ddb.send(cmd, { abortSignal: opts?.signal })
}
