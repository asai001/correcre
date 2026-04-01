import PastPerformance from "@employee/features/past-performance";
import { requireCurrentEmployeeUser } from "@employee/lib/auth/current-user";

export default async function PastPerformancePage() {
  const currentUser = await requireCurrentEmployeeUser();

  return <PastPerformance companyId={currentUser.companyId} userId={currentUser.userId} />;
}
