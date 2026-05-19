import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { MERCHANT_LOGIN_PATH } from "@merchant/lib/auth/constants";

export default function RegistrationCompletePage() {
  return (
    <>
      <Image className="mt-12 lg:mt-24" src="/correcre-logo.svg" alt="" width={160} height={37} />
      <div className="mt-12 mb-16 w-9/10 max-w-[520px] lg:mb-20">
        <div className="w-full rounded bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">登録申請を受け付けました</h1>
          <p className="mt-4 text-sm text-neutral-700">
            ご入力いただいた内容で登録申請を受け付けました。運営による審査が完了次第、登録メールアドレスに仮パスワード付きの招待メールをお送りします。
          </p>
          <p className="mt-4 text-sm text-neutral-700">
            審査結果のご連絡までしばらくお待ちください。
          </p>

          <div className="mt-8 text-center">
            <Link
              href={MERCHANT_LOGIN_PATH as Route}
              className="text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
      <Image
        className="absolute bottom-5 right-7.5 h-auto w-16 lg:bottom-15 lg:right-20 lg:w-[110px]"
        src="/favicon.png"
        alt=""
        width={110}
        height={110}
      />
    </>
  );
}
