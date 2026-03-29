type AdminCognitoConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  issuer: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAdminCognitoConfig(): AdminCognitoConfig {
  const region = readRequiredEnv("ADMIN_COGNITO_REGION");
  const userPoolId = readRequiredEnv("ADMIN_COGNITO_USER_POOL_ID");
  const clientId = readRequiredEnv("ADMIN_COGNITO_APP_CLIENT_ID");

  return {
    region,
    userPoolId,
    clientId,
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  };
}
