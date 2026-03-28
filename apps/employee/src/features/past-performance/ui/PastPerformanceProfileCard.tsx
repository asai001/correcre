"use client";

import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type PastPerformanceProfileCardProps = {
  name: string;
  department: string;
};

export default function PastPerformanceProfileCard({ name, department }: PastPerformanceProfileCardProps) {
  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#5b8cf7" }}>
          <FontAwesomeIcon icon={faUser} style={{ color: "#fff", width: "2rem", height: "2rem" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{name}</h2>
          <p className="mt-1 text-gray-600">{department}</p>
        </div>
      </div>
    </div>
  );
}
