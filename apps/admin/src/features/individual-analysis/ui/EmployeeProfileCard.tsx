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
        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#5b8cf7" }}>
          <FontAwesomeIcon icon={faUser} className="text-xl lg:text-3xl" style={{ color: "#fff" }} />
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
