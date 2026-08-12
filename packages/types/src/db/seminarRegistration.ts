export type SeminarRegistrationItem = {
  pk: `SEMINAR#${string}`;
  sk: `EMAIL#${string}`;
  seminarId: string;
  email: string;
  name: string;
  companyName: string;
  /** 申込者が選んだ開催回の ID。開催回選択より前の申込には存在しない。 */
  sessionId?: string;
  /** 申込時点の開催回ラベル。開催回の設定を差し替えても申込内容を読めるように保存する。 */
  sessionLabel?: string;
  phoneNumber?: string;
  attendeeCount?: number;
  question?: string;
  userAgent?: string;
  /** 初回申込日時。同じメールアドレスで再送信されても変わらない。 */
  registeredAt: string;
  updatedAt: string;
  /** 同じメールアドレスからの申込（再送信を含む）回数。 */
  submitCount: number;
  /** 直近で Zoom 情報メールの送信に成功した日時。 */
  notifiedAt?: string;
  /** 直近の申込でメール送信に失敗した場合のエラー内容。成功時は削除される。 */
  notificationError?: string;
};
