type MerchantCognitoConfig = {
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

export function getMerchantCognitoConfig(): MerchantCognitoConfig {
  const region = readRequiredEnv("MERCHANT_COGNITO_REGION");
  const userPoolId = readRequiredEnv("MERCHANT_COGNITO_USER_POOL_ID");
  const clientId = readRequiredEnv("MERCHANT_COGNITO_APP_CLIENT_ID");

  return {
    region,
    userPoolId,
    clientId,
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  };
}
