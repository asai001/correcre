// @TODO 一旦問答無用で遷移
// required をつぶしている
"use client";

import Link from "next/link";

import { Button, TextField, Checkbox } from "@mui/material";

import { authenticate } from "@admin/app/lib/actions/authenticate";

export default function LoginForm() {
  return (
    <div className="bg-[#D8FAFF]/40 w-full pt-15 rounded">
      <div className="w-4/5 mx-auto">
        <form action={authenticate}>
          <div className="">
            <span className="text-neutral-600">ID または メールアドレス</span>
            <TextField
              className="bg-white"
              fullWidth
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              // required
              variant="outlined"
              size="small"
            />
          </div>
          <div className="mt-5">
            <span className="text-neutral-600">パスワード</span>

            <TextField
              className="bg-white"
              fullWidth
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              // required
              variant="outlined"
              size="small"
            />
          </div>
          <div className="mt-5">
            <Checkbox id="login-info" name="login-info" size="small" sx={{ p: 0, pr: 1 }} />
            <label htmlFor="login-info" className="text-neutral-600">
              ログイン情報を保持
            </label>
          </div>

          <Link href={"#"} className="mt-2 block text-neutral-600 text-sm underline">
            パスワードを忘れた方はこちら
          </Link>
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ my: 5, py: 1.5 }}>
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}
