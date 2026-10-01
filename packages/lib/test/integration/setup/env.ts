// 各テストワーカーで DynamoDB Local の接続先を既定値に揃える（globalSetup と同じ値）。
process.env.DDB_ENDPOINT = process.env.DDB_ENDPOINT?.trim() || "http://127.0.0.1:8000";
