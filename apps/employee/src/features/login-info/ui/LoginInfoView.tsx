import type { LoginInfo } from "../model/types";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

type LoginInfoViewProps = {
  data: LoginInfo;
};

export default function LoginInfoView({ data }: LoginInfoViewProps) {
  const { displayName, departmentName, lastLoginAt } = data;

  return (
    <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-2 lg:gap-5">
        <div className="w-18 h-18 mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#5b8cf7" }}>
          <FontAwesomeIcon icon={faUser} className="text-2xl lg:text-4xl" style={{ color: "#fff" }} />
        </div>

        <div>
          <div className="font-bold lg:text-lg">{displayName} さん</div>
          <div className="lg:text-base text-gray-600">{departmentName ?? ""}</div>
        </div>
      </div>
      <div>
        <div className="lg:text-base text-gray-600">最終ログイン</div>
        <div className="lg:text-sm text-gray-600">{lastLoginAt ?? "－"}</div>
      </div>
    </div>
  );
}
