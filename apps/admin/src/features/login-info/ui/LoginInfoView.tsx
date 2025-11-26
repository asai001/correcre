import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { LoginInfo } from "../model/types";

import { faUser } from "@fortawesome/free-solid-svg-icons";

type LoginInfoProps = {
  data: LoginInfo;
};

export default function LoginInfoView({ data }: LoginInfoProps) {
  return (
    <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-2 lg:gap-5">
        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
          <FontAwesomeIcon icon={faUser} className="text-xl text-white" style={{ color: "#fff" }} />
        </div>

        <div>
          <div className="font-bold lg:text-lg">{data.name}</div>
          <div className="lg:text-base text-gray-600">システム管理者</div>
        </div>
      </div>
      <div>
        <div className="lg:text-base text-gray-600">管理対象従業員数</div>
        <div className="lg:text-2xl text-purple-600 font-bold">{data.activeEmployees}名</div>
      </div>
    </div>
  );
}
