This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Cognito Login

Set these environment variables for the admin app:

```bash
ADMIN_COGNITO_REGION=ap-northeast-1
ADMIN_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
ADMIN_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_OPERATOR_EMAILS=operator1@example.com,operator2@example.com
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
DDB_MISSION_TABLE_NAME=correcre-mission-dev
DDB_MISSION_REPORT_TABLE_NAME=correcre-mission-report-dev
DDB_USER_MONTHLY_STATS_TABLE_NAME=correcre-user-monthly-stats-dev
DDB_EXCHANGE_HISTORY_TABLE_NAME=correcre-exchange-history-dev
```

The values are emitted by the CDK stack as `AdminCognitoRegion`, `AdminCognitoUserPoolId`, and `AdminCognitoUserPoolClientId`.
The DynamoDB table names are emitted as `UserTableName`, `CompanyTableName`, `DepartmentTableName`, `MissionTableName`, `MissionReportTableName`, `UserMonthlyStatsTableName`, and `ExchangeHistoryTableName`.
For local development against the dev AWS account, use `AWS_PROFILE=CorreCre-Dev-Account` and run `aws sso login --profile CorreCre-Dev-Account` beforehand.

`AdminCognitoUserPoolId` is shared with the employee app. Only the app client ID differs between the two applications.

This configuration uses email-and-password sign-in. The Cognito password policy is 8 characters minimum with no uppercase, lowercase, digit, or symbol requirement.

`ADMIN_OPERATOR_EMAILS` is optional. When set, the `/employee-management` screen and its API are restricted to the comma-separated email addresses in the Cognito ID token. If it is omitted, any authenticated admin user can access that screen.

If a user is created from the Cognito console with a temporary password, the admin app redirects that user to `/login/new-password` and completes the `NEW_PASSWORD_REQUIRED` challenge there.

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
