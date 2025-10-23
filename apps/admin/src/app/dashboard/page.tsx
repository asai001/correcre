import User from "@admin/components/dashboard/User";
import ScoreTile from "@admin/components/dashboard/ScoreTile";
import MenuTile from "@admin/components/dashboard/MenuTile";
import AvgPointsTrendChart from "@admin/components/dashboard/AvgPointsTrendChart";
import AvgItemCompletionChart from "@admin/components/dashboard/AvgItemCompletionChart";

import { faUsers, faChartLine, faCog, faChartBar, faTable } from "@fortawesome/free-solid-svg-icons";
import MissionListTable from "@admin/components/dashboard/MissionListTable";

/** 先月終端の過去12ヶ月ラベルを生成（SSR側） */
function makeLabels(): string[] {
  const out: string[] = [];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  end.setMonth(end.getMonth() - 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function fetchLabel(): string[] {
  return ["挨拶活動", "健康推進活動", "自己研鑽・成長", "効率化・改善提案", "地域活動"];
}

export default function DashboardPage() {
  const avgPointsTrendlabels = makeLabels();
  const avgPointsTrendData = [50, 64, 56, 90, 76, 88, 92, 78, 84, 80, 82, 97]; // 将来的にデータベースからとってくる
  const avgItemCompletionlabels = fetchLabel();
  const avgItemCompletionData = [70, 80, 85, 80, 70]; // 将来的にデータベースからとってくる
  return (
    <div className="container mb-10 mx-auto px-6">
      <div className="my-5">
        <User />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="-mx-6 px-6 flex gap-4 overflow-x-auto overflow-y-visible py-4 md:grid md:grid-cols-3">
        <ScoreTile className="min-w-[220px] md:min-w-0" label="総従業員数" value={18} unit="名" color="#2563EB" />
        <ScoreTile className="min-w-[220px] md:min-w-0" label="先月総獲得ポイント" value={38450} unit="ポイント" color="#D97706" />
        <ScoreTile className="min-w-[220px] md:min-w-0" label="今月交換ポイント" value={15200} unit="ポイント" color="#059669" />
      </div>
      {/* md (768px) 以上の場合に ScoreTile をグリッドで3等分で横並びにする */}
      <div className="-mx-6 px-6 gap-2 md:gap-4 py-4 grid grid-cols-2 md:grid-cols-3">
        <MenuTile
          className="md:min-w-0"
          icon={faUsers}
          iconColor="#000000"
          menuName="従業員管理"
          desc="従業員情報の登録・編集・削除・ポイント付与管理"
        />
        <MenuTile
          className="md:min-w-0"
          icon={faChartBar}
          iconColor="#2563EB"
          menuName="分析・レポート"
          desc="実績分析・傾向把握・レポート出力・交換履歴"
        />
        <MenuTile className="md:min-w-0" icon={faCog} iconColor="#6B7280" menuName="システム設定" desc="基本設定・権限管理・バックアップ" />
      </div>
      <div className="grid lg:grid-cols-2 mt-5 gap-4">
        <AvgPointsTrendChart
          className="min-w-[220px] md:min-w-0"
          icon={faChartLine}
          labels={avgPointsTrendlabels}
          data={avgPointsTrendData}
        />
        <AvgItemCompletionChart
          className="min-w-[220px] md:min-w-0"
          icon={faChartLine}
          labels={avgItemCompletionlabels}
          data={avgItemCompletionData}
        />
      </div>
      <div className="mt-5">
        <MissionListTable icon={faTable} />
      </div>
    </div>
  );
}
