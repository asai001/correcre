import User from "@admin/components/dashboard/User";
import ScoreTile from "@admin/components/dashboard/ScoreTile";
import MenuTile from "@admin/components/dashboard/MenuTile";

import { faUsers, faChartLine, faCog } from "@fortawesome/free-solid-svg-icons";

export default function DashboardPage() {
  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="mt-5">
        <User />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
        <ScoreTile className="min-w-[220px] md:min-w-0" label="総従業員数" value={18} unit="名" color="#2563EB" />
        <ScoreTile className="min-w-[220px] md:min-w-0" label="先月総獲得ポイント" value={38450} unit="ポイント" color="#D97706" />
        <ScoreTile className="min-w-[220px] md:min-w-0" label="今月交換ポイント" value={15200} unit="ポイント" color="#059669" />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
        <MenuTile
          className="min-w-[220px] md:min-w-0"
          icon={faUsers}
          iconColor="#000000"
          menuName="従業員管理"
          desc="従業員情報の登録・編集・削除・ポイント付与管理"
        />
        <MenuTile
          className="min-w-[220px] md:min-w-0"
          icon={faChartLine}
          iconColor="#2563EB"
          menuName="分析・レポート"
          desc="実績分析・傾向把握・レポート出力・交換履歴"
        />
        <MenuTile
          className="min-w-[220px] md:min-w-0"
          icon={faCog}
          iconColor="#6B7280"
          menuName="システム設定"
          desc="基本設定・権限管理・バックアップ"
        />
      </div>
    </div>
  );
}
