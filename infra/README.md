# Correcre Infra

`infra` は Correcre の AWS インフラを管理する CDK プロジェクトです。

`cdk.json` には CDK の実行設定が定義されており、`bin/infra.ts` から各環境の stack を作成します。

## 環境

このプロジェクトでは、以下の 3 環境を定義しています。

- `CorrecreDevInfraStack`
- `CorrecreStgInfraStack`
- `CorrecreProdInfraStack`

各 stack では、環境ごとに 1 つの共有 Cognito User Pool を作成し、その配下に 2 つの App Client を作成します。

- `admin`
- `employee`

認証は Cognito が担当します。  
管理者アプリと従業員アプリの認可は、アプリケーション側の DB で判定する想定です。

## Cognito の方針

- 1 環境につき 1 つの共有 User Pool を使います
- ログインはメールアドレス + パスワードです
- パスワードは 8 文字以上です
- 大文字、小文字、数字、記号の必須条件はありません

補足:
Cognito 単体では「半角英数字のみ」を厳密に強制できません。

## DynamoDB の方針

Correcre のアプリケーションデータは、単一テーブルではなく multi-table 構成で管理します。  
CDK の定義は [`lib/dynamodb.ts`](./lib/dynamodb.ts) に集約し、[`lib/infra-stack.ts`](./lib/infra-stack.ts) から参照します。

### 設計方針

- Cognito は認証を担当し、認可は User テーブルを正として判定します
- Cognito のユーザー識別子は `sub` を使い、User テーブルの `cognitoSub` と紐付けます
- 管理者権限は `User.roles` に `ADMIN` を含むかで判定します
- `Philosophy` は独立テーブルではなく Company に内包します
- `PointTransaction` はポイント履歴の source of truth として扱います
- `User.currentPointBalance` は高速表示のために保持しますが、監査・取消・再計算の正本は `PointTransaction` とします
- `MissionReport` と `ExchangeHistory` はイベントテーブルとして扱います
- `UserMonthlyStats` は read model であり、正本ではありません

### 共通設定

- Billing Mode: `PAY_PER_REQUEST`
- Encryption: `AWS_MANAGED`
- Contributor Insights: `prod` のみ有効
- Deletion Protection: `prod` のみ有効
- Point-in-Time Recovery: `prod` のみ有効
- Removal Policy:
  - `prod`: `RETAIN`
  - `dev` / `stg`: `DESTROY`

### キー命名方針

- Company / User / Department / Mission のような会社単位のマスタ・スナップショット系テーブルは、既存型や業務モデルとの対応をわかりやすくするため、PK 名に `companyId` を使います
- MissionReport / UserMonthlyStats / ExchangeHistory / PointTransaction のようなイベント・派生データ系テーブルは、複合文字列キーを使うため、PK/SK 名に汎用的な `pk` / `sk` を使います

将来的に完全統一するなら、全テーブルを `pk` / `sk` に寄せる案が最も整合的です。  
ただし現時点では、既存コードとの移行容易性を優先して混在を許容しています。

## DynamoDB テーブル詳細

### 1. Company

会社マスタです。`philosophy` は Company アイテムに内包します。

| 項目 | 内容 |
| --- | --- |
| PK | `companyId = <companyId>` |
| SK | なし |
| 主な属性 | `name`, `status`, `plan`, `perEmployeeMonthlyFee`, `companyPointBalance`, `totalEmployees`, `activeEmployees`, `philosophy`, `createdAt`, `updatedAt` |
| GSI | なし |

`philosophy` には以下を保持します。

- `corporatePhilosophy`
- `purpose`
- `mission`
- `vision`
- `values`
- `creed`
- `updatedAt`

### 2. User

従業員情報、ログイン主体、認可情報を持つテーブルです。

| 項目 | 内容 |
| --- | --- |
| PK | `companyId = <companyId>` |
| SK | `sk = USER#<userId>` |
| 主な属性 | `userId`, `companyId`, `cognitoSub`, `name`, `email`, `loginId`, `departmentId`, `departmentName`, `roles`, `status`, `joinedAt`, `lastLoginAt`, `currentPointBalance`, `currentMonthCompletionRate`, `createdAt`, `updatedAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `UserByCognitoSub` | `gsi1pk = COGNITO_SUB#<cognitoSub>` | Cognito `sub` から User を引く |
| `UserByEmail` | `gsi2pk = EMAIL#<email>` | メールアドレス検索 |
| `UserByDepartment` | `gsi3pk = COMPANY#<companyId>#DEPT#<departmentId>` / `gsi3sk = USER#<userId>` | 会社・部門単位のユーザー一覧 |

認可方針:

- 管理者画面へのアクセス可否は `roles` に `ADMIN` を含むかで判定します
- Cognito Groups は使わず、User テーブル側を認可の正とします

### 3. Department

部門マスタです。部門 CRUD がある前提で明示的に持ちます。

| 項目 | 内容 |
| --- | --- |
| PK | `companyId = <companyId>` |
| SK | `sk = DEPT#<departmentId>` |
| 主な属性 | `departmentId`, `companyId`, `name`, `status`, `sortOrder`, `createdAt`, `updatedAt` |
| GSI | なし |

部門名ではなく `departmentId` を基準に扱い、部門名変更に耐えられる構造にします。

### 4. Mission

会社ごとのミッション定義です。将来の定義変更に備えて `version` を持ちます。

| 項目 | 内容 |
| --- | --- |
| PK | `companyId = <companyId>` |
| SK | `sk = MISSION#<missionId>#VER#<version>` |
| 主な属性 | `missionId`, `version`, `title`, `description`, `category`, `monthlyCount`, `score`, `enabled`, `order`, `fields`, `createdAt`, `updatedAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `MissionByCompanyAndEnabledOrder` | `gsi1pk = COMPANY#<companyId>` / `gsi1sk = ENABLED#<0|1>#ORDER#<order>#MISSION#<missionId>#VER#<version>` | 有効ミッション一覧、表示順、会社単位の検索 |

### 5. MissionReport

ミッション報告のイベント明細です。ミッション定義変更の影響を受けないよう、提出時点のスナップショットを保持します。

| 項目 | 内容 |
| --- | --- |
| PK | `pk = COMPANY#<companyId>#USER#<userId>` |
| SK | `sk = REPORTED_AT#<ISO8601>#REPORT#<reportId>` |
| 主な属性 | `reportId`, `companyId`, `userId`, `missionId`, `missionVersion`, `missionTitleSnapshot`, `scoreSnapshot`, `fieldValues`, `status`, `reportedAt`, `reviewedAt`, `reviewedByUserId`, `reviewComment`, `createdAt`, `updatedAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `MissionReportByCompanyReportedAt` | `gsi1pk = COMPANY#<companyId>` / `gsi1sk = REPORTED_AT#<ISO8601>#USER#<userId>#REPORT#<reportId>` | 会社全体の recent reports / 期間検索 |
| `MissionReportByCompanyStatusReportedAt` | `gsi2pk = COMPANY#<companyId>#STATUS#<status>` / `gsi2sk = REPORTED_AT#<ISO8601>#USER#<userId>#REPORT#<reportId>` | 承認待ち一覧などの状態別検索 |

補足:

- `missionTitleSnapshot` と `scoreSnapshot` は、提出時点のミッション内容の写しです
- `fieldValues` は本番では必須寄りの属性として扱う前提です

### 6. UserMonthlyStats

月次集計の read model です。画面表示高速化のための派生データであり、正本ではありません。

| 項目 | 内容 |
| --- | --- |
| PK | `pk = COMPANY#<companyId>#USER#<userId>` |
| SK | `sk = YM#<YYYY-MM>` |
| 主な属性 | `companyId`, `userId`, `yearMonth`, `earnedPoints`, `usedPoints`, `earnedScore`, `completionRate`, `missionCompletedCount`, `updatedAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `UserMonthlyStatsByCompanyYearMonth` | `gsi1pk = COMPANY#<companyId>` / `gsi1sk = YM#<YYYY-MM>#USER#<userId>` | 会社単位の月次一覧、分析画面向け集計 |

### 7. ExchangeHistory

交換履歴のイベントテーブルです。商品マスタ変更の影響を受けないよう、交換時点のスナップショットを保持します。

| 項目 | 内容 |
| --- | --- |
| PK | `pk = COMPANY#<companyId>#USER#<userId>` |
| SK | `sk = EXCHANGED_AT#<ISO8601>#EXCHANGE#<exchangeId>` |
| 主な属性 | `exchangeId`, `companyId`, `userId`, `merchandiseId`, `merchandiseNameSnapshot`, `usedPoint`, `quantity`, `status`, `exchangedAt`, `createdAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `ExchangeHistoryByCompanyExchangedAt` | `gsi1pk = COMPANY#<companyId>` / `gsi1sk = EXCHANGED_AT#<ISO8601>#USER#<userId>#EXCHANGE#<exchangeId>` | 会社全体の交換履歴一覧、時系列参照 |

### 8. PointTransaction

ポイント台帳です。ポイント増減履歴・監査・取消・再計算の正本として扱います。

| 項目 | 内容 |
| --- | --- |
| PK | `pk = COMPANY#<companyId>#USER#<userId>` |
| SK | `sk = OCCURRED_AT#<ISO8601>#TX#<transactionId>` |
| 主な属性 | `transactionId`, `companyId`, `userId`, `type`, `points`, `reasonType`, `relatedReportId`, `relatedExchangeId`, `note`, `occurredAt`, `createdAt` |

GSI:

| Index | キー | 用途 |
| --- | --- | --- |
| `PointTransactionByCompanyOccurredAt` | `gsi1pk = COMPANY#<companyId>` / `gsi1sk = OCCURRED_AT#<ISO8601>#USER#<userId>#TX#<transactionId>` | 会社全体の監査、時系列参照、バックオフィス確認 |

補足:

- `type` は `EARN` / `USE` / `ADJUST_PLUS` / `ADJUST_MINUS`
- `reasonType` は `MISSION_APPROVED` / `EXCHANGE` / `MANUAL_ADJUST` / `CANCEL_EXCHANGE` / `REVOKE_MISSION` など、将来拡張しやすい形で持ちます

## 認証・認可フロー

サーバー側では以下の流れを前提にします。

1. Cognito でログインする
2. JWT を検証する
3. `sub` を取得する
4. User テーブルを `UserByCognitoSub` で引く
5. `roles` を確認する
6. `ADMIN` を持つ場合のみ管理者 API / 管理画面へのアクセスを許可する

## 初回ログイン時の紐付け方針

事前招待型を前提にします。

- 管理者が先に User テーブルへユーザーを登録します
- `email` や `loginId` は事前登録しておきます
- 初回ログイン後に該当ユーザーへ `cognitoSub` を紐付けます
- 以後は `cognitoSub` を主キー的な識別子として利用します

## ポイント更新処理の方針

- `User.currentPointBalance` を各所から直接更新しないこと
- ポイント加算・減算・調整は必ず共通サービス / ユースケース経由に集約すること
- 商品交換時は `currentPointBalance >= usedPoint` の条件付き更新を前提とすること
- 商品交換時は可能な限り 1 トランザクションで以下を処理すること
  - `User.currentPointBalance` 更新
  - `ExchangeHistory` 追加
  - `PointTransaction` 追加
- ミッション承認時は可能な限り 1 トランザクションで以下を処理すること
  - `MissionReport` の状態更新
  - `User.currentPointBalance` 更新
  - `PointTransaction` 追加
  - 必要に応じて `UserMonthlyStats` 更新

## 実装メモ

- 既存の `apps/mock` の構造を踏まえ、移行しやすい形でデータモデルを寄せています
- `department` 周りは今後アプリ側型定義の整理が必要です
- `monthly-points-history` のように生集計している箇所は、順次 `UserMonthlyStats` を使う方向で見直します

## ブランチ対応

- `develop -> dev`
- `stage -> stg`
- `main -> prod`

## よく使うコマンド

`infra` ディレクトリ内で実行する場合:

- `npm run build`
- `npm run watch`
- `npm run test`
- `npm run deploy:dev`
- `npm run deploy:stg`
- `npm run deploy:prod`
- `npm run cdk -- diff`
- `npm run cdk -- synth`

リポジトリのルートで実行する場合:

- `npm run -w infra build`
- `npm run -w infra deploy:dev`
- `npm run -w infra deploy:stg`
- `npm run -w infra deploy:prod`

## 補足

- `deploy:dev` は `CorreCre-Dev-Account` プロファイルを使います
- `deploy:stg` は `CorreCre-Stg-Account` プロファイルを使います
- `deploy:prod` は `CorreCre-Prod-Account` プロファイルを使います
- 事前に `aws sso login --profile <profile>` が必要になる場合があります
