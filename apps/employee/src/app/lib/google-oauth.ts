const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const GOOGLE_OAUTH_SCOPES = [GOOGLE_SHEETS_SCOPE, GOOGLE_DRIVE_SCOPE];

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  redirectUri?: string;
};

type GoogleOAuthConfigOptions = {
  requireRefreshToken?: boolean;
};

export function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  let normalized = value.trim();

  if (normalized.startsWith('"') && normalized.endsWith('",')) {
    normalized = normalized.slice(1, -2);
  } else if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }

  return normalized.trim();
}

function normalizeRefreshToken(value: string | undefined): string | undefined {
  let normalized = normalizeEnvValue(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("GOOGLE_OAUTH_REFRESH_TOKEN=")) {
    normalized = normalized.slice("GOOGLE_OAUTH_REFRESH_TOKEN=".length);
  }

  if (normalized.startsWith("refresh_token=")) {
    normalized = normalized.slice("refresh_token=".length);
  }

  return normalized.trim();
}

export function getGoogleOAuthConfig(options?: GoogleOAuthConfigOptions): GoogleOAuthConfig {
  const clientId = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = normalizeRefreshToken(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  const redirectUri = normalizeEnvValue(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  const requireRefreshToken = options?.requireRefreshToken ?? true;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth configuration is incomplete");
  }

  if (requireRefreshToken && !refreshToken) {
    throw new Error("GOOGLE_OAUTH_REFRESH_TOKEN is not set");
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    redirectUri,
  };
}

export function resolveGoogleOAuthRedirectUri(config: GoogleOAuthConfig, requestUrl: string): string {
  if (config.redirectUri) {
    return config.redirectUri;
  }

  return new URL("/api/google-oauth/callback", requestUrl).toString();
}

export function buildGoogleOAuthAuthorizationUrl(config: GoogleOAuthConfig, redirectUri: string, state: string): string {
  const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

async function exchangeToken(params: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = (await response.json()) as GoogleTokenResponse;

  if (!response.ok) {
    throw new Error(json.error_description || json.error || "Failed to exchange Google OAuth token");
  }

  return json;
}

export async function refreshGoogleAccessToken(config: GoogleOAuthConfig): Promise<string> {
  if (!config.refreshToken) {
    throw new Error("GOOGLE_OAUTH_REFRESH_TOKEN is not set");
  }

  const json = await exchangeToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  );

  if (!json.access_token) {
    throw new Error("Google OAuth refresh response did not include access_token");
  }

  return json.access_token;
}

export async function exchangeGoogleAuthorizationCode(
  config: GoogleOAuthConfig,
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  return exchangeToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
}
