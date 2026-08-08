export type SubmitSeminarRegistrationInput = {
  name: string;
  companyName: string;
  email: string;
  phoneNumber?: string;
  attendeeCount?: number;
  question?: string;
  /** bot 対策の hidden 項目。人間が入力することはないため、値があれば破棄する。 */
  website?: string;
};

export type SeminarZoomInfo = {
  url: string;
  meetingId?: string;
  passcode?: string;
};

export type SubmitSeminarRegistrationResult = {
  title: string;
  scheduleText?: string;
  zoom: SeminarZoomInfo;
  /** Zoom 情報メールを送信できたか。false ならフォーム上の Zoom 情報を控えてもらう。 */
  emailDelivered: boolean;
};

/** 公開ページに渡す情報。Zoom URL / パスコードは申込前のページ HTML に含めない。 */
export type SeminarPageInfo = {
  configured: boolean;
  title: string;
  scheduleText?: string;
};
