import Image from "next/image";
import type { UserForDashboard } from "../model/types";

type UserInfoProps = {
  user: UserForDashboard;
};

export default function UserInfo({ user }: UserInfoProps) {
  const { displayName, departmentName, lastLoginAt } = user;

  return (
    <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 lg:gap-5">
        <Image src="/human.svg" alt="ユーザーアイコン" className="w-10 h-10 lg:w-12 lg:h-12" width={40} height={40} />
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
