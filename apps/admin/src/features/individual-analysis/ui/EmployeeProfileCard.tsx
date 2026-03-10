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
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#5b8cf7" }}>
          <FontAwesomeIcon icon={faUser} className="text-xl lg:text-3xl" style={{ color: "#fff" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>
          <p className="text-gray-600 mt-1">
            {department}
            {role && ` · ${role}`}
          </p>
        </div>
      </div>
    </div>
  );
}
