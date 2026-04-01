This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Cognito Login

Set these environment variables for the employee app:

```bash
EMPLOYEE_COGNITO_REGION=ap-northeast-1
EMPLOYEE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
EMPLOYEE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_MISSION_TABLE_NAME=correcre-mission-dev
DDB_MISSION_REPORT_TABLE_NAME=correcre-mission-report-dev
DDB_USER_MONTHLY_STATS_TABLE_NAME=correcre-user-monthly-stats-dev
DDB_EXCHANGE_HISTORY_TABLE_NAME=correcre-exchange-history-dev
```

The values are emitted by the CDK stack as `EmployeeCognitoRegion`, `EmployeeCognitoUserPoolId`, and `EmployeeCognitoUserPoolClientId`.
The DynamoDB table names are emitted by the CDK stack as `UserTableName`, `CompanyTableName`, `MissionTableName`, `MissionReportTableName`, `UserMonthlyStatsTableName`, and `ExchangeHistoryTableName`.
For local development against the dev AWS account, use `AWS_PROFILE=CorreCre-Dev-Account` and run `aws sso login --profile CorreCre-Dev-Account` beforehand.

`EmployeeCognitoUserPoolId` is shared with the admin app. Only the app client ID differs between the two applications.

This configuration uses email-and-password sign-in. The Cognito password policy is 8 characters minimum with no uppercase, lowercase, digit, or symbol requirement.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
