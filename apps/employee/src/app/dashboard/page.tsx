import Philosophy from "@employee/components/dashboard/Philosophy";
import User from "@employee/components/dashboard/User";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-6">
      <div className="pt-5">
        <Philosophy />
      </div>
      <div>
        <User />
      </div>
    </div>
  );
}
