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
