import "server-only";

import { toInvoiceIssuer, type InvoiceIssuer } from "@correcre/lib/company-invoice";
import { getInvoiceIssuerSetting, putInvoiceIssuerSetting } from "@correcre/lib/dynamodb/system-setting";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { InvoiceIssuerSettingItem } from "@correcre/types";

import type { InvoiceIssuerSettingsData } from "../model/types";

function getTableConfig() {
  return {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName: readRequiredServerEnv("DDB_SYSTEM_SETTING_TABLE_NAME"),
  };
}

function toData(item: InvoiceIssuerSettingItem | null): InvoiceIssuerSettingsData {
  if (!item) {
    return { issuer: null };
  }
  return { issuer: toInvoiceIssuer(item), updatedAt: item.updatedAt };
}

export async function getInvoiceIssuerSettingsData(): Promise<InvoiceIssuerSettingsData> {
  return toData(await getInvoiceIssuerSetting(getTableConfig()));
}

export async function updateInvoiceIssuerSettings(input: {
  issuer: InvoiceIssuer;
  updatedBy: string;
}): Promise<InvoiceIssuerSettingsData> {
  return toData(await putInvoiceIssuerSetting(getTableConfig(), input));
}
