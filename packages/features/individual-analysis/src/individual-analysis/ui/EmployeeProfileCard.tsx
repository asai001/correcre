"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

type EmployeeProfileCardProps = {
  name: string;
  department: string;
  role?: string;
};

export default function EmployeeProfileCard({ name, department, role }: EmployeeProfileCardProps) {
  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Keep explicit width/height plus shrink-0 so the icon stays perfectly circular in flex layouts. */}
        <div
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: "3rem", height: "3rem", backgroundColor: "#5b8cf7" }}
        >
          <FontAwesomeIcon icon={faUser} className="text-xl lg:text-3xl" style={{ width: "1.75rem", height: "1.75rem", color: "#fff" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>
          <p className="mt-1 text-gray-600">
            {department}
            {role ? ` | ${role}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
