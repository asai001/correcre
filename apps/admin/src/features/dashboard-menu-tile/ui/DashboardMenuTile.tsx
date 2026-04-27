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
        menuName="ユーザー管理"
        desc="ユーザー情報、権限、ログイン状況をまとめて確認し、登録や編集を行えます。"
      />
      <MenuTile
        link="/analysis-report"
        className="md:min-w-0"
        icon={faChartBar}
        iconColor="#2563EB"
        menuName="分析・レポート"
        desc="全社傾向と個人分析を見ながら、日々の運用状況を確認できます。"
      />
      <MenuTile
        link="/info"
        className="md:min-w-0"
        icon={faCog}
        iconColor="#6B7280"
        menuName="各種情報画面"
        desc="理念体系、会社情報、ポイント設定、部署、ミッション定義、アカウント情報をまとめて確認・更新できます。"
      />
    </div>
  );
}
