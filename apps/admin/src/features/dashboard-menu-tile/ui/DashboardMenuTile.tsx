"use client";

import MenuTile from "@admin/components/dashboard/MenuTile";
import { faChartBar, faCog, faUsers } from "@fortawesome/free-solid-svg-icons";

export default function DashboardMenuTile() {
  return (
    <div className="-mx-6 flex gap-4 overflow-x-auto overflow-y-visible px-6 py-4 md:grid md:grid-cols-3">
      <MenuTile
        link="/employee-management"
        className="md:min-w-0"
        icon={faUsers}
        iconColor="#000000"
        menuName="従業員管理"
        desc="従業員情報、部署、ポイント残高をまとめて確認し、管理画面から運用できる一覧です。"
      />
      <MenuTile
        link="/analysis-report"
        className="md:min-w-0"
        icon={faChartBar}
        iconColor="#2563EB"
        menuName="分析レポート"
        desc="全体分析と個人分析を切り替えながら、達成率やポイント推移を確認できます。"
      />
      <MenuTile
        link="#"
        className="md:min-w-0"
        icon={faCog}
        iconColor="#6B7280"
        menuName="システム設定"
        desc="基本設定や権限管理などの管理機能を今後拡張できる枠として配置しています。"
      />
    </div>
  );
}
