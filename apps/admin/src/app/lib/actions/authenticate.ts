// @TODO 一旦問答無用で遷移
// 想定する実装は以下
// 実装場所：packages/validation
// 仕様ライブラリ：auth.js
// ...
"use server";

import { redirect } from "next/navigation";

export async function authenticate() {
  try {
    redirect("/dashboard");
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw error;
  }
}
