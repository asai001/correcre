"use client";

import MenuTile from "@admin/components/dashboard/MenuTile";

import { faUsers, faCog, faChartBar } from "@fortawesome/free-solid-svg-icons";

export default function DashboardMenuTile() {
  return (
    <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
      <MenuTile
        link={"#"}
        className="md:min-w-0"
        icon={faUsers}
        iconColor="#000000"
        menuName="従業員管理"
        desc="従業員情報の登録・編集・削除・ポイント付与管理"
      />
      <MenuTile
        link={"#"}
        className="md:min-w-0"
        icon={faChartBar}
        iconColor="#2563EB"
        menuName="分析・レポート"
        desc="実績分析・傾向把握・レポート出力・交換履歴"
      />
      <MenuTile
        link={"#"}
        className="md:min-w-0"
        icon={faCog}
        iconColor="#6B7280"
        menuName="システム設定"
        desc="基本設定・権限管理・バックアップ"
      />
    </div>
  );
}
