import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_API_SCOPES = `${GOOGLE_SHEETS_SCOPE} ${GOOGLE_DRIVE_SCOPE}`;
const DEFAULT_SPREADSHEET_ID = "1w3zImdrkcfotGOxXulGJpKIwaJuXYN7fX4-gAH2bYyE";
const DEFAULT_PARTNER_SHEET_ID = 515487691;
const DEFAULT_MERCHANDISE_SHEET_ID = 2026862223;
const DEFAULT_CARD_IMAGE_FOLDER_ID = "1dtDBFpKVLCoGtFAfwAZnTsu1hH0SX1d5c-6lZ7R59kweuREDrHN-xgwVJ92pO0bZoQi-mPht";
const DEFAULT_DETAIL_IMAGE_FOLDER_ID = "1pYI8LqY-pGmA8X4lMx_O2S9CuP4F3PFvxYmuc5m9Ux4TVd3bjUQs6Epl_hbyPTYSwRrSpjSS";
const PARTNER_INFO_RANGE = "B:L";
const MERCHANDISE_INFO_RANGE = "C:M";

type StoreAddressMode = "same_company" | "no_store" | "other";

type RegisterMerchandisePartnerPayload = {
  partnerEmail: string;
  companyName: string;
  companyLocation: string;
  storeAddressMode: StoreAddressMode;
  storeAddressOther: string;
  customerInquiryContact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  bankTransferAccount: string;
  paymentCycle: string;
};

type RegisterMerchandiseProductPayload = {
  heading: string;
  merchandiseName: string;
  serviceDescription: string;
  price: string;
  deliveryMethods: string[];
  serviceArea: string;
  genre: string;
  genreOther: string;
};

type RegisterMerchandiseSubmission = {
  partner: RegisterMerchandisePartnerPayload;
  product: RegisterMerchandiseProductPayload;
  cardImage: File | null;
  detailImage: File | null;
};

type GoogleIntegrationConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  partnerSheetId: number;
  merchandiseSheetId: number;
  partnerSheetName?: string;
  merchandiseSheetName?: string;
  cardImageFolderId: string;
  detailImageFolderId: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type SpreadsheetMetadataResponse = {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
};

type GoogleDriveFileResponse = {
  id?: string;
  webViewLink?: string;
  error?: {
    message?: string;
  };
};

function getRequiredText(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function getOptionalText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getTextList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .flatMap((value) => (typeof value === "string" && value.trim() !== "" ? [value.trim()] : []));
}

function getOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function parseStoreAddressMode(value: string): StoreAddressMode {
  if (value !== "same_company" && value !== "no_store" && value !== "other") {
    throw new Error("storeAddressMode is invalid");
  }

  return value;
}

async function parseRequest(req: Request): Promise<RegisterMerchandiseSubmission> {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type must be multipart/form-data");
  }

  const formData = await req.formData();
  const deliveryMethods = getTextList(formData, "deliveryMethods");

  if (deliveryMethods.length === 0) {
    throw new Error("deliveryMethods is required");
  }

  return {
    partner: {
      partnerEmail: getRequiredText(formData, "partnerEmail"),
      companyName: getRequiredText(formData, "companyName"),
      companyLocation: getRequiredText(formData, "companyLocation"),
      storeAddressMode: parseStoreAddressMode(getRequiredText(formData, "storeAddressMode")),
      storeAddressOther: getOptionalText(formData, "storeAddressOther"),
      customerInquiryContact: getRequiredText(formData, "customerInquiryContact"),
      contactPersonName: getRequiredText(formData, "contactPersonName"),
      contactPersonPhone: getRequiredText(formData, "contactPersonPhone"),
      bankTransferAccount: getOptionalText(formData, "bankTransferAccount"),
      paymentCycle: getOptionalText(formData, "paymentCycle"),
    },
    product: {
      heading: getRequiredText(formData, "heading"),
      merchandiseName: getRequiredText(formData, "merchandiseName"),
      serviceDescription: getRequiredText(formData, "serviceDescription"),
      price: getRequiredText(formData, "price"),
      deliveryMethods,
      serviceArea: getRequiredText(formData, "serviceArea"),
      genre: getRequiredText(formData, "genre"),
      genreOther: getOptionalText(formData, "genreOther"),
    },
    cardImage: getOptionalFile(formData, "cardImage"),
    detailImage: getOptionalFile(formData, "detailImage"),
  };
}

function parseOptionalInteger(value: string | undefined, fallback: number, envName: string): number {
  const parsed = value?.trim() ? Number(value) : fallback;

  if (!Number.isInteger(parsed)) {
    throw new Error(`${envName} is invalid`);
  }

  return parsed;
}

function getGoogleIntegrationConfig(): GoogleIntegrationConfig {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const spreadsheetId = process.env.GOOGLE_PARTNER_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
  const partnerSheetName = process.env.GOOGLE_PARTNER_SHEET_NAME?.trim();
  const merchandiseSheetName = process.env.GOOGLE_MERCHANDISE_SHEET_NAME?.trim();
  const partnerSheetId = parseOptionalInteger(process.env.GOOGLE_PARTNER_SHEET_ID, DEFAULT_PARTNER_SHEET_ID, "GOOGLE_PARTNER_SHEET_ID");
  const merchandiseSheetId = parseOptionalInteger(
    process.env.GOOGLE_MERCHANDISE_SHEET_ID,
    DEFAULT_MERCHANDISE_SHEET_ID,
    "GOOGLE_MERCHANDISE_SHEET_ID",
  );
  const cardImageFolderId = process.env.GOOGLE_CARD_IMAGE_FOLDER_ID?.trim() || DEFAULT_CARD_IMAGE_FOLDER_ID;
  const detailImageFolderId = process.env.GOOGLE_DETAIL_IMAGE_FOLDER_ID?.trim() || DEFAULT_DETAIL_IMAGE_FOLDER_ID;

  if (!clientEmail || !privateKey) {
    throw new Error("Google API configuration is incomplete");
  }

  return {
    clientEmail,
    privateKey,
    spreadsheetId,
    partnerSheetId,
    merchandiseSheetId,
    partnerSheetName: partnerSheetName || undefined,
    merchandiseSheetName: merchandiseSheetName || undefined,
    cardImageFolderId,
    detailImageFolderId,
  };
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function createServiceAccountJwt(clientEmail: string, privateKey: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const encodedHeader = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = toBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: GOOGLE_API_SCOPES,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: issuedAt,
      exp: expiresAt,
    }),
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${signer.sign(privateKey).toString("base64url")}`;
}

async function getGoogleAccessToken(config: GoogleIntegrationConfig): Promise<string> {
  const assertion = createServiceAccountJwt(config.clientEmail, config.privateKey);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Failed to fetch Google access token");
  }

  return json.access_token;
}

async function fetchSpreadsheetMetadata(spreadsheetId: string, accessToken: string): Promise<SpreadsheetMetadataResponse> {
  const response = await fetch(`${GOOGLE_SHEETS_API_BASE_URL}/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load spreadsheet metadata");
  }

  return (await response.json()) as SpreadsheetMetadataResponse;
}

function findSheetNameById(metadata: SpreadsheetMetadataResponse, sheetId: number): string {
  const sheetTitle = metadata.sheets
    ?.find((sheet) => sheet.properties?.sheetId === sheetId)
    ?.properties?.title?.trim();

  if (!sheetTitle) {
    throw new Error(`Sheet not found for sheetId ${sheetId}`);
  }

  return sheetTitle;
}

function formatTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function formatTimestampCompact(date = new Date()): string {
  return formatTimestamp(date).replace(/[^\d]/g, "");
}

function resolveStoreAddress(payload: RegisterMerchandisePartnerPayload): string {
  if (payload.storeAddressMode === "same_company") {
    return payload.companyLocation;
  }

  if (payload.storeAddressMode === "no_store") {
    return "店舗無し";
  }

  if (payload.storeAddressOther.trim() === "") {
    throw new Error("storeAddressOther is required when storeAddressMode is other");
  }

  return payload.storeAddressOther.trim();
}

function resolveGenreLabel(payload: RegisterMerchandiseProductPayload): string {
  return payload.genre === "その他" ? payload.genreOther.trim() || "その他" : payload.genre;
}

function buildPartnerRow(payload: RegisterMerchandisePartnerPayload): string[] {
  return [
    formatTimestamp(),
    payload.companyName,
    payload.companyLocation,
    resolveStoreAddress(payload),
    payload.customerInquiryContact,
    payload.contactPersonName,
    payload.contactPersonPhone,
    payload.partnerEmail,
    payload.bankTransferAccount,
    payload.partnerEmail,
    payload.paymentCycle,
  ];
}

function buildProductRow(
  partner: RegisterMerchandisePartnerPayload,
  product: RegisterMerchandiseProductPayload,
  detailImageUrl: string,
  cardImageUrl: string,
): string[] {
  return [
    formatTimestamp(),
    partner.companyName,
    product.merchandiseName,
    product.serviceDescription,
    product.price,
    product.deliveryMethods.join("、"),
    product.serviceArea,
    detailImageUrl,
    cardImageUrl,
    product.heading,
    resolveGenreLabel(product),
  ];
}

function escapeSheetTitleForA1(sheetTitle: string): string {
  return `'${sheetTitle.replace(/'/g, "''")}'`;
}

async function appendRow(
  spreadsheetId: string,
  sheetName: string,
  range: string,
  accessToken: string,
  row: string[],
): Promise<void> {
  const a1Range = `${escapeSheetTitleForA1(sheetName)}!${range}`;
  const response = await fetch(
    `${GOOGLE_SHEETS_API_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(a1Range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [row],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to append row");
  }
}

function sanitizeFileNameSegment(value: string): string {
  const normalized = value.normalize("NFKC").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
  return normalized || "file";
}

function buildDriveFileName(prefix: "card" | "detail", file: File, companyName: string, merchandiseName: string): string {
  return [
    formatTimestampCompact(),
    prefix,
    sanitizeFileNameSegment(companyName),
    sanitizeFileNameSegment(merchandiseName),
    sanitizeFileNameSegment(file.name),
  ].join("_");
}

async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  file: File,
  fileName: string,
): Promise<string> {
  const boundary = `correcre_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${
      file.type || "application/octet-stream"
    }\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: Buffer.concat([prefix, fileBuffer, suffix]),
    },
  );
  const json = (await response.json()) as GoogleDriveFileResponse;

  if (!response.ok || !json.id) {
    throw new Error(json.error?.message || "Failed to upload file to Google Drive");
  }

  return json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`;
}

export async function POST(req: Request) {
  try {
    const submission = await parseRequest(req);
    const config = getGoogleIntegrationConfig();
    const accessToken = await getGoogleAccessToken(config);
    const spreadsheetMetadata = await fetchSpreadsheetMetadata(config.spreadsheetId, accessToken);
    const partnerSheetName = config.partnerSheetName || findSheetNameById(spreadsheetMetadata, config.partnerSheetId);
    const merchandiseSheetName =
      config.merchandiseSheetName || findSheetNameById(spreadsheetMetadata, config.merchandiseSheetId);

    const cardImageUrl = submission.cardImage
      ? await uploadFileToDrive(
          accessToken,
          config.cardImageFolderId,
          submission.cardImage,
          buildDriveFileName("card", submission.cardImage, submission.partner.companyName, submission.product.merchandiseName),
        )
      : "";
    const detailImageUrl = submission.detailImage
      ? await uploadFileToDrive(
          accessToken,
          config.detailImageFolderId,
          submission.detailImage,
          buildDriveFileName("detail", submission.detailImage, submission.partner.companyName, submission.product.merchandiseName),
        )
      : "";

    await appendRow(config.spreadsheetId, partnerSheetName, PARTNER_INFO_RANGE, accessToken, buildPartnerRow(submission.partner));
    await appendRow(
      config.spreadsheetId,
      merchandiseSheetName,
      MERCHANDISE_INFO_RANGE,
      accessToken,
      buildProductRow(submission.partner, submission.product, detailImageUrl, cardImageUrl),
    );

    return NextResponse.json({
      ok: true,
      cardImageUrl,
      detailImageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    const status = /required|invalid|Content-Type/.test(message) ? 400 : 500;

    console.error("POST /api/register-merchandise error", error);

    return NextResponse.json({ error: message }, { status });
  }
}
