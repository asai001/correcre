import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";

import { InfraStack, type InfraStackProps, type InfraStage } from "../lib/infra-stack";

function createStack(stage: InfraStage, overrides: Partial<InfraStackProps> = {}): InfraStack {
  const app = new cdk.App();

  return new InfraStack(app, `Correcre${stage}TestStack`, {
    env: {
      account: "123456789012",
      region: "ap-northeast-1",
    },
    stage,
    adminAppUrl: "https://admin.example.com/",
    employeeAppUrl: "https://employee.example.com/",
    sourceContext: "test",
    ...overrides,
  });
}

function getAllowedOrigins(template: Template, bucketName: string): string[] {
  const resources = template.findResources("AWS::S3::Bucket", {
    Properties: {
      BucketName: bucketName,
    },
  });
  const matchedResources = Object.values(resources);

  expect(matchedResources).toHaveLength(1);

  const properties = (matchedResources[0] as {
    Properties?: { CorsConfiguration?: { CorsRules?: { AllowedOrigins?: string[] }[] } };
  }).Properties;
  const corsRules = properties?.CorsConfiguration?.CorsRules ?? [];

  expect(corsRules).toHaveLength(1);

  return corsRules[0]?.AllowedOrigins ?? [];
}

function getSingleTableResource(template: Template, tableName: string): Record<string, unknown> {
  const resources = template.findResources("AWS::DynamoDB::Table", {
    Properties: {
      TableName: tableName,
    },
  });
  const matchedResources = Object.values(resources);

  expect(matchedResources).toHaveLength(1);

  return matchedResources[0] as Record<string, unknown>;
}

const INTERNAL_CUSTOM_MESSAGE_DESCRIPTION = "Customize Cognito forgot-password and admin-create-user emails.";
const MERCHANT_CUSTOM_MESSAGE_DESCRIPTION =
  "Customize Cognito forgot-password and admin-create-user emails (merchant pool).";

function getCustomMessageLambdaCode(template: Template, description: string) {
  const resources = template.findResources("AWS::Lambda::Function", {
    Properties: {
      Description: description,
      Handler: "index.handler",
    },
  });
  const matchedResources = Object.values(resources);

  expect(matchedResources).toHaveLength(1);

  return (
    ((matchedResources[0] as { Properties?: { Code?: { ZipFile?: string } } }).Properties?.Code?.ZipFile as string) ?? ""
  );
}

function expectCustomMessageEmailCustomization(template: Template, fromEmail: string) {
  template.hasResourceProperties(
    "AWS::Lambda::Function",
    Match.objectLike({
      Description: INTERNAL_CUSTOM_MESSAGE_DESCRIPTION,
      Handler: "index.handler",
    }),
  );

  template.hasResourceProperties(
    "AWS::Lambda::Function",
    Match.objectLike({
      Description: MERCHANT_CUSTOM_MESSAGE_DESCRIPTION,
      Handler: "index.handler",
    }),
  );

  template.hasResourceProperties(
    "AWS::Cognito::UserPool",
    Match.objectLike({
      EmailConfiguration: Match.objectLike({
        EmailSendingAccount: "DEVELOPER",
        From: `=?UTF-8?B?44Kz44Os44Kv44Os?= <${fromEmail}>`,
      }),
      LambdaConfig: Match.objectLike({
        CustomMessage: Match.anyValue(),
      }),
    }),
  );
}

describe("InfraStack", () => {
  test("provisions the requested multi-table DynamoDB design", () => {
    const template = Template.fromStack(createStack("dev"));
    const devUserTable = getSingleTableResource(template, "correcre-user-dev");

    template.resourceCountIs("AWS::DynamoDB::Table", 20);

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-user-dev",
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "companyId",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "UserByCognitoSub",
          }),
          Match.objectLike({
            IndexName: "UserByEmail",
          }),
          Match.objectLike({
            IndexName: "UserByDepartment",
          }),
        ]),
      }),
    );

    expect(
      (devUserTable.Properties as { PointInTimeRecoverySpecification?: unknown }).PointInTimeRecoverySpecification,
    ).toBeUndefined();
    expect(devUserTable.DeletionPolicy).toBe("Delete");
    expect(devUserTable.UpdateReplacePolicy).toBe("Delete");

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-mission-report-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "MissionReportByCompanyReportedAt",
          }),
          Match.objectLike({
            IndexName: "MissionReportByCompanyStatusReportedAt",
          }),
        ]),
        SSESpecification: {
          SSEEnabled: true,
        },
      }),
    );

    // Mission テーブル: slotIndex 方式（GSI なし）
    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-mission-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "companyId",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
      }),
    );

    // MissionHistory テーブル
    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-mission-history-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-point-transaction-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "PointTransactionByCompanyOccurredAt",
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-support-inquiry-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
        ]),
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "SupportInquiryByCreatedAt",
          }),
          Match.objectLike({
            IndexName: "SupportInquiryByStatusCreatedAt",
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-seminar-registration-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
      }),
    );

    // 配送日程調整: ExchangeHistory のスパース GSI（日次バッチの横断クエリ用）
    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-exchange-history-dev",
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({
            IndexName: "ExchangeHistoryByScheduleStatus",
            KeySchema: Match.arrayWith([
              Match.objectLike({
                AttributeName: "gsi4pk",
                KeyType: "HASH",
              }),
              Match.objectLike({
                AttributeName: "gsi4sk",
                KeyType: "RANGE",
              }),
            ]),
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-merchant-calendar-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "merchantId",
            KeyType: "HASH",
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-schedule-event-dev",
        KeySchema: Match.arrayWith([
          Match.objectLike({
            AttributeName: "pk",
            KeyType: "HASH",
          }),
          Match.objectLike({
            AttributeName: "sk",
            KeyType: "RANGE",
          }),
        ]),
      }),
    );
  });

  test("schedules the monthly point reflection batch at 00:05 JST on the 1st", () => {
    const template = Template.fromStack(createStack("stg"));

    template.hasResourceProperties(
      "AWS::Lambda::Function",
      Match.objectLike({
        FunctionName: "correcre-point-reflection-stg",
        Handler: "index.handler",
        Environment: {
          Variables: Match.objectLike({
            // テーブル名は Ref トークンとして解決されるため、値の存在のみ検証する。
            USER_TABLE_NAME: Match.anyValue(),
          }),
        },
      }),
    );

    // JST の毎月1日 00:05 = UTC の前月末日 15:05（cron の "L" は月末日）。
    template.hasResourceProperties(
      "AWS::Events::Rule",
      Match.objectLike({
        Name: "correcre-point-reflection-stg",
        ScheduleExpression: "cron(5 15 L * ? *)",
        State: "ENABLED",
      }),
    );

    template.hasResourceProperties(
      "AWS::CloudWatch::Alarm",
      Match.objectLike({
        AlarmName: "correcre-point-reflection-errors-stg",
        MetricName: "Errors",
        Namespace: "AWS/Lambda",
        Threshold: 1,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
      }),
    );
  });

  test("grants the point reflection batch access to the user table", () => {
    const template = Template.fromStack(createStack("stg"));
    const inlinePolicies = template.findResources("AWS::IAM::Policy");

    type PolicyResource = {
      Properties: {
        PolicyDocument: {
          Statement: Array<{ Action?: unknown; Effect?: string }>;
        };
      };
    };

    // Vercel OIDC ロールも DynamoDB 権限を持つため、Lambda のロールに紐付くポリシーに限定して検証する。
    const batchPolicy = Object.entries(inlinePolicies).find(([logicalId]) =>
      logicalId.startsWith("PointReflectionFunctionServiceRoleDefaultPolicy"),
    )?.[1] as PolicyResource | undefined;

    expect(batchPolicy).toBeDefined();

    const dynamoStatement = (batchPolicy?.Properties.PolicyDocument.Statement ?? []).find((stmt) => {
      const action = stmt.Action;
      if (!Array.isArray(action)) {
        return false;
      }
      return action.includes("dynamodb:Scan") && action.includes("dynamodb:UpdateItem") && stmt.Effect === "Allow";
    });

    expect(dynamoStatement).toBeDefined();
  });

  test("uses retain and point-in-time recovery only in production", () => {
    const template = Template.fromStack(createStack("prod"));
    const prodCompanyTable = getSingleTableResource(template, "correcre-company-prod");

    template.hasResourceProperties(
      "AWS::DynamoDB::Table",
      Match.objectLike({
        TableName: "correcre-company-prod",
        DeletionProtectionEnabled: true,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
          RecoveryPeriodInDays: 35,
        },
      }),
    );

    expect(prodCompanyTable.DeletionPolicy).toBe("Retain");
    expect(prodCompanyTable.UpdateReplacePolicy).toBe("Retain");
  });

  test("uses destroy semantics outside production", () => {
    const template = Template.fromStack(createStack("stg"));
    const stgCompanyTable = getSingleTableResource(template, "correcre-company-stg");

    expect(stgCompanyTable.DeletionPolicy).toBe("Delete");
    expect(stgCompanyTable.UpdateReplacePolicy).toBe("Delete");
    expect(
      (stgCompanyTable.Properties as { PointInTimeRecoverySpecification?: unknown }).PointInTimeRecoverySpecification,
    ).toBeUndefined();
  });

  test("configures Cognito with 8+ character passwords and no required character classes", () => {
    const template = Template.fromStack(createStack("dev"));

    template.hasResourceProperties(
      "AWS::Cognito::UserPool",
      Match.objectLike({
        Policies: {
          PasswordPolicy: Match.objectLike({
            MinimumLength: 8,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
            TemporaryPasswordValidityDays: 7,
          }),
        },
      }),
    );
  });

  test("uses SES-backed forgot-password email customization in development", () => {
    const template = Template.fromStack(createStack("dev"));

    expectCustomMessageEmailCustomization(template, "correcre-info@efficient-technology.com");
  });

  test("uses SES-backed forgot-password email customization in staging", () => {
    const template = Template.fromStack(createStack("stg"));

    expectCustomMessageEmailCustomization(template, "correcre-info@efficient-technology.com");
  });

  test("uses SES-backed forgot-password email customization in production", () => {
    const template = Template.fromStack(createStack("prod"));

    expectCustomMessageEmailCustomization(template, "no-reply@correcre.jp");
  });

  test("embeds development admin-create-user routing in the custom message lambda", () => {
    const template = Template.fromStack(createStack("dev"));
    const internalCode = getCustomMessageLambdaCode(template, INTERNAL_CUSTOM_MESSAGE_DESCRIPTION);
    const merchantCode = getCustomMessageLambdaCode(template, MERCHANT_CUSTOM_MESSAGE_DESCRIPTION);

    expect(internalCode).toContain("CustomMessage_AdminCreateUser");
    expect(internalCode).toContain("http://localhost:3000/login");
    expect(merchantCode).toContain("CustomMessage_AdminCreateUser");
    expect(merchantCode).toContain("http://localhost:3003/login");
  });

  test("embeds staging admin-create-user routing in the custom message lambda", () => {
    const template = Template.fromStack(createStack("stg"));
    const internalCode = getCustomMessageLambdaCode(template, INTERNAL_CUSTOM_MESSAGE_DESCRIPTION);
    const merchantCode = getCustomMessageLambdaCode(template, MERCHANT_CUSTOM_MESSAGE_DESCRIPTION);

    expect(internalCode).toContain("https://stage.admin.correcre.jp/login");
    expect(internalCode).toContain("https://stage.app.correcre.jp/login");
    expect(internalCode).toContain("https://stage.operator.correcre.jp/login");
    expect(merchantCode).toContain("https://stage.merchant.correcre.jp/login");
  });

  test("embeds production admin-create-user routing in the custom message lambda", () => {
    const template = Template.fromStack(createStack("prod"));
    const internalCode = getCustomMessageLambdaCode(template, INTERNAL_CUSTOM_MESSAGE_DESCRIPTION);
    const merchantCode = getCustomMessageLambdaCode(template, MERCHANT_CUSTOM_MESSAGE_DESCRIPTION);

    expect(internalCode).toContain("https://admin.correcre.jp/login");
    expect(internalCode).toContain("https://app.correcre.jp/login");
    expect(merchantCode).toContain("https://merchant.correcre.jp/login");
  });

  test("separates the merchant user pool from the internal admin/employee/operator pool", () => {
    const template = Template.fromStack(createStack("dev"));

    template.resourceCountIs("AWS::Cognito::UserPool", 2);

    template.hasResourceProperties(
      "AWS::Cognito::UserPool",
      Match.objectLike({
        UserPoolName: "correcre-users-dev",
      }),
    );

    template.hasResourceProperties(
      "AWS::Cognito::UserPool",
      Match.objectLike({
        UserPoolName: "correcre-merchant-users-dev",
      }),
    );
  });

  test("creates one app client per app across the two pools", () => {
    const template = Template.fromStack(createStack("dev"));

    template.resourceCountIs("AWS::Cognito::UserPoolClient", 4);

    template.hasResourceProperties(
      "AWS::Cognito::UserPoolClient",
      Match.objectLike({
        ClientName: "correcre-admin-web-dev",
      }),
    );

    template.hasResourceProperties(
      "AWS::Cognito::UserPoolClient",
      Match.objectLike({
        ClientName: "correcre-employee-web-dev",
      }),
    );

    template.hasResourceProperties(
      "AWS::Cognito::UserPoolClient",
      Match.objectLike({
        ClientName: "correcre-operator-web-dev",
      }),
    );

    template.hasResourceProperties(
      "AWS::Cognito::UserPoolClient",
      Match.objectLike({
        ClientName: "correcre-merchant-web-dev",
      }),
    );
  });

  test("creates a Vercel OIDC role scoped to the expected projects and environment", () => {
    const template = Template.fromStack(createStack("stg"));

    template.hasResourceProperties(
      "AWS::IAM::Role",
      Match.objectLike({
        RoleName: "correcre-vercel-dynamodb-stg",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringEquals: {
                  "oidc.vercel.com/asai001s-projects-3e71fbe6:aud":
                    "https://vercel.com/asai001s-projects-3e71fbe6",
                },
                StringLike: {
                  "oidc.vercel.com/asai001s-projects-3e71fbe6:sub": [
                    "owner:asai001s-projects-3e71fbe6:project:correcre-admin:environment:preview",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-employee:environment:preview",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-operator:environment:preview",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-merchant:environment:preview",
                  ],
                },
              },
            }),
          ]),
        },
      }),
    );
  });

  test("grants the Vercel OIDC role Cognito admin user provisioning permissions", () => {
    const template = Template.fromStack(createStack("stg"));

    const inlinePolicies = template.findResources("AWS::IAM::Policy");
    const managedPolicies = template.findResources("AWS::IAM::ManagedPolicy");

    type PolicyResource = {
      Properties: {
        PolicyDocument: {
          Statement: Array<{ Action?: unknown; Effect?: string }>;
        };
      };
    };

    const allStatements = [...Object.values(inlinePolicies), ...Object.values(managedPolicies)].flatMap(
      (resource) => (resource as PolicyResource).Properties.PolicyDocument.Statement ?? [],
    );

    const cognitoStatement = allStatements.find((stmt) => {
      const action = stmt.Action;
      if (!Array.isArray(action)) {
        return false;
      }
      return (
        action.includes("cognito-idp:AdminCreateUser") &&
        action.includes("cognito-idp:AdminDeleteUser") &&
        action.includes("cognito-idp:AdminResetUserPassword") &&
        action.includes("cognito-idp:AdminUpdateUserAttributes") &&
        stmt.Effect === "Allow"
      );
    });

    expect(cognitoStatement).toBeDefined();
  });

  test("grants the Vercel OIDC role SES email sending permissions", () => {
    const template = Template.fromStack(createStack("stg"));
    const inlinePolicies = template.findResources("AWS::IAM::Policy");

    type PolicyResource = {
      Properties: {
        PolicyDocument: {
          Statement: Array<{ Action?: unknown; Effect?: string; Resource?: unknown }>;
        };
      };
    };

    const allStatements = Object.values(inlinePolicies).flatMap(
      (resource) => (resource as PolicyResource).Properties.PolicyDocument.Statement ?? [],
    );

    const sesStatement = allStatements.find((stmt) => {
      const action = stmt.Action;
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

      return (
        action === "ses:SendEmail" &&
        stmt.Effect === "Allow" &&
        resources.some((resource) => JSON.stringify(resource).includes("identity/efficient-technology.com"))
      );
    });

    expect(sesStatement).toBeDefined();
  });

  test("grants the production Vercel OIDC role SES sending from the correcre.jp identity", () => {
    const template = Template.fromStack(createStack("prod"));

    type PolicyResource = {
      Properties: {
        PolicyDocument: {
          Statement: Array<{ Action?: unknown; Effect?: string; Resource?: unknown }>;
        };
      };
    };

    // 本番は IAM ポリシーが大きく、CDK が一部を ManagedPolicy(Overflow) に分割するため両方を見る。
    const policyResources = {
      ...template.findResources("AWS::IAM::Policy"),
      ...template.findResources("AWS::IAM::ManagedPolicy"),
    };

    const allStatements = Object.values(policyResources).flatMap(
      (resource) => (resource as PolicyResource).Properties.PolicyDocument.Statement ?? [],
    );

    const sesStatement = allStatements.find((stmt) => {
      const action = stmt.Action;
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];

      return (
        action === "ses:SendEmail" &&
        stmt.Effect === "Allow" &&
        resources.some((resource) => JSON.stringify(resource).includes("identity/correcre.jp"))
      );
    });

    expect(sesStatement).toBeDefined();
  });

  // アプリのドメインとバケットの CORS 許可オリジンがずれると、
  // 署名付き URL への直 PUT がプリフライトで弾かれて画像アップロードが失敗する。
  test("allows every app origin to upload images directly to the image buckets", () => {
    const template = Template.fromStack(
      createStack("stg", {
        adminAppUrl: "https://stage.admin.example.com/",
        employeeAppUrl: "https://stage.app.example.com/",
        operatorAppUrl: "https://stage.operator.example.com/",
        merchantAppUrl: "https://stage.merchant.example.com/",
      }),
    );

    for (const bucketName of [
      "correcre-mission-report-image-stg-123456789012",
      "correcre-merchandise-image-stg-123456789012",
    ]) {
      const allowedOrigins = getAllowedOrigins(template, bucketName);

      // 末尾スラッシュを含むとオリジンとして一致しないため、除去されている必要がある。
      expect(allowedOrigins).toEqual(
        expect.arrayContaining([
          "https://stage.admin.example.com",
          "https://stage.app.example.com",
          "https://stage.operator.example.com",
          "https://stage.merchant.example.com",
        ]),
      );
    }
  });

  test("keeps legacy origins allowed while a domain migration is in progress", () => {
    const template = Template.fromStack(
      createStack("stg", {
        adminAppUrl: "https://stage.admin.example.com/",
        employeeAppUrl: "https://stage.app.example.com/",
        additionalCorsOrigins: [
          "https://stage.admin.example.com",
          "https://legacy-admin.example.com",
        ],
      }),
    );
    const allowedOrigins = getAllowedOrigins(template, "correcre-merchandise-image-stg-123456789012");

    expect(allowedOrigins).toContain("https://legacy-admin.example.com");
    expect(allowedOrigins.filter((origin) => origin === "https://stage.admin.example.com")).toHaveLength(1);
  });

  test("does not allow localhost origins on the production image buckets", () => {
    const template = Template.fromStack(createStack("prod"));
    const allowedOrigins = getAllowedOrigins(template, "correcre-merchandise-image-prod-123456789012");

    expect(allowedOrigins.some((origin) => origin.startsWith("http://localhost"))).toBe(false);
  });

  test("scopes the dev AWS account to development subjects only", () => {
    const template = Template.fromStack(createStack("dev"));

    template.hasResourceProperties(
      "AWS::IAM::Role",
      Match.objectLike({
        RoleName: "correcre-vercel-dynamodb-dev",
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringEquals: {
                  "oidc.vercel.com/asai001s-projects-3e71fbe6:aud":
                    "https://vercel.com/asai001s-projects-3e71fbe6",
                },
                StringLike: {
                  "oidc.vercel.com/asai001s-projects-3e71fbe6:sub": [
                    "owner:asai001s-projects-3e71fbe6:project:correcre-admin:environment:development",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-employee:environment:development",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-operator:environment:development",
                    "owner:asai001s-projects-3e71fbe6:project:correcre-merchant:environment:development",
                  ],
                },
              },
            }),
          ]),
        },
      }),
    );
  });
});
