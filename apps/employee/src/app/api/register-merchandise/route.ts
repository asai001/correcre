import { normalizeEnvValue, refreshGoogleAccessToken, type GoogleOAuthConfig, getGoogleOAuthConfig } from "@employee/app/lib/google-oauth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DEFAULT_SPREADSHEET_ID = "1w3zImdrkcfotGOxXulGJpKIwaJuXYN7fX4-gAH2bYyE";
const DEFAULT_PARTNER_SHEET_ID = 515487691;
const DEFAULT_MERCHANDISE_SHEET_ID = 2026862223;
const DEFAULT_CARD_IMAGE_FOLDER_ID = "1dtDBFpKVLCoGtFAfwAZnTsu1hH0SX1d5c-6lZ7R59kweuREDrHN-xgwVJ92pO0bZoQi-mPht";
const DEFAULT_DETAIL_IMAGE_FOLDER_ID = "1pYI8LqY-pGmA8X4lMx_O2S9CuP4F3PFvxYmuc5m9Ux4TVd3bjUQs6Epl_hbyPTYSwRrSpjSS";
const PARTNER_INFO_RANGE = "A:L";
const MERCHANDISE_INFO_RANGE = "A:N";

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

type GoogleIntegrationConfig = GoogleOAuthConfig & {
  spreadsheetId: string;
  partnerSheetId: number;
  merchandiseSheetId: number;
  partnerSheetName?: string;
  merchandiseSheetName?: string;
  cardImageFolderId: string;
  detailImageFolderId: string;
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
  const oauthConfig = getGoogleOAuthConfig();
  const spreadsheetId = normalizeEnvValue(process.env.GOOGLE_SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID;
  const partnerSheetName = normalizeEnvValue(process.env.GOOGLE_PARTNER_SHEET_NAME);
  const merchandiseSheetName = normalizeEnvValue(process.env.GOOGLE_MERCHANDISE_SHEET_NAME);
  const partnerSheetId = parseOptionalInteger(process.env.GOOGLE_PARTNER_SHEET_ID, DEFAULT_PARTNER_SHEET_ID, "GOOGLE_PARTNER_SHEET_ID");
  const merchandiseSheetId = parseOptionalInteger(
    process.env.GOOGLE_MERCHANDISE_SHEET_ID,
    DEFAULT_MERCHANDISE_SHEET_ID,
    "GOOGLE_MERCHANDISE_SHEET_ID",
  );
  const cardImageFolderId = normalizeEnvValue(process.env.GOOGLE_CARD_IMAGE_FOLDER_ID) || DEFAULT_CARD_IMAGE_FOLDER_ID;
  const detailImageFolderId = normalizeEnvValue(process.env.GOOGLE_DETAIL_IMAGE_FOLDER_ID) || DEFAULT_DETAIL_IMAGE_FOLDER_ID;

  return {
    ...oauthConfig,
    spreadsheetId,
    partnerSheetId,
    merchandiseSheetId,
    partnerSheetName: partnerSheetName || undefined,
    merchandiseSheetName: merchandiseSheetName || undefined,
    cardImageFolderId,
    detailImageFolderId,
  };
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

function asSheetLiteralText(value: string): string {
  return value === "" ? "" : `'${value}`;
}

function resolveProductCoverageArea(
  partner: RegisterMerchandisePartnerPayload,
  product: RegisterMerchandiseProductPayload,
): string {
  const hasStoreVisit = product.deliveryMethods.includes("来店");
  const hasRemoteOrShipping = product.deliveryMethods.some((method) => method === "出張" || method === "発送" || method === "オンライン");
  const sections: string[] = [];

  if (hasStoreVisit) {
    sections.push(resolveStoreAddress(partner));
  }

  if (hasRemoteOrShipping) {
    sections.push(product.serviceArea);
  }

  if (sections.length === 0) {
    return product.serviceArea;
  }

  return sections.join(" / ");
}

function buildPartnerRow(payload: RegisterMerchandisePartnerPayload): string[] {
  return [
    "",
    formatTimestamp(),
    payload.companyName,
    payload.companyLocation,
    resolveStoreAddress(payload),
    payload.customerInquiryContact,
    payload.contactPersonName,
    asSheetLiteralText(payload.contactPersonPhone),
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
    "",
    "",
    formatTimestamp(),
    partner.companyName,
    product.merchandiseName,
    product.serviceDescription,
    product.price,
    product.deliveryMethods.join("、"),
    resolveProductCoverageArea(partner, product),
    detailImageUrl,
    cardImageUrl,
    product.heading,
    resolveGenreLabel(product),
    partner.partnerEmail,
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

async function uploadFileToDrive(accessToken: string, folderId: string, file: File, fileName: string): Promise<string> {
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
  const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: Buffer.concat([prefix, fileBuffer, suffix]),
  });
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
    const accessToken = await refreshGoogleAccessToken(config);
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
    const status = /required|invalid|Content-Type|GOOGLE_OAUTH_REFRESH_TOKEN/.test(message) ? 400 : 500;

    console.error("POST /api/register-merchandise error", error);

    return NextResponse.json({ error: message }, { status });
  }
}
