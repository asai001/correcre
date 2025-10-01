import Link from "next/link";

import { Button, TextField, Checkbox } from "@mui/material";

export default function LoginForm() {
  return (
    <div className="bg-white/70 w-full pt-15 rounded">
      <div className="w-4/5 mx-auto">
        <form action="">
          <div className="">
            <span className="text-neutral-600">ID または メールアドレス</span>
            <TextField
              fullWidth
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              required
              variant="outlined"
              size="small"
            />
          </div>
          <div className="mt-5">
            <span className="text-neutral-600">パスワード</span>

            <TextField
              fullWidth
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
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
