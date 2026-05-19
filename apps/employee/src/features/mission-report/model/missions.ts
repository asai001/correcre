export type MissionListItem = {
  name: string;
  scoreLabel: string;
  countLabel: string;
  description: string;
  submission: string;
  example: string;
};

// TODO: API 化する際の差し替えポイント
export const MISSION_LIST_ITEMS: MissionListItem[] = [
  {
    name: "挨拶活動",
    scoreLabel: "1点",
    countLabel: "20回",
    description: "朝礼に参加する",
    submission: "朝礼に参加した日に参加申告",
    example: "参加",
  },
  {
    name: "健康推進活動",
    scoreLabel: "1点",
    countLabel: "20回",
    description: "健康維持・向上のための活動",
    submission: "実施内容を入力",
    example: "歩数記録、ジョギング、睡眠管理、食事管理、禁煙、休肝日など",
  },
  {
    name: "自己研鑽・成長",
    scoreLabel: "4点",
    countLabel: "5回",
    description: "業務に関連した内容の自主学習",
    submission: "参考資料名・学習内容・どう活かすかを入力",
    example: "Youtubeで、資格取得に関する学習。資格取得ができたら○○の業務に活かす。",
  },
  {
    name: "効率化・改善提案",
    scoreLabel: "6点",
    countLabel: "5回",
    description: "社内環境改善やアイデアの提案",
    submission: "提案内容・期待される効果を入力",
    example: "蓋つきゴミ箱の設置、休憩時間の室内換気など",
  },
  {
    name: "地域活動",
    scoreLabel: "10点",
    countLabel: "1回",
    description: "自宅や会社近くの地域活動に参加",
    submission: "日時・参加活動・感想を入力",
    example: "ゴミ拾い、草むしり、祭りの準備など",
  },
];
