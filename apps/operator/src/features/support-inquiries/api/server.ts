import "server-only";

import {
  isSupportInquiryTableMissingError,
  listSupportInquiries,
  resolveSupportInquiryTableName,
  updateSupportInquiryStatus,
} from "@correcre/lib/dynamodb/support-inquiry";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import type { DBUserItem, SupportInquiryStatus } from "@correcre/types";

import type { SupportInquiryListData } from "../model/types";

function getTableConfig() {
  const tableName = resolveSupportInquiryTableName();

  if (!tableName) {
    return null;
  }

  return {
    region: readRequiredServerEnv("AWS_REGION"),
    tableName,
  };
}

export async function getSupportInquiryListData(): Promise<SupportInquiryListData> {
  const config = getTableConfig();

  if (!config) {
    return {
      items: [],
      tableAvailable: false,
    };
  }

  try {
    const items = await listSupportInquiries(config, { limit: 200 });
    return {
      items,
      tableAvailable: true,
    };
  } catch (error) {
    if (isSupportInquiryTableMissingError(error)) {
      console.warn(`Support inquiry table "${config.tableName}" not found.`);
      return {
        items: [],
        tableAvailable: false,
      };
    }

    throw error;
  }
}

export async function updateSupportInquiryStatusForOperator(
  inquiryId: string,
  status: SupportInquiryStatus,
  operatorUser: DBUserItem,
) {
  const config = getTableConfig();

  if (!config) {
    throw new Error("DDB_SUPPORT_INQUIRY_TABLE_NAME is not set.");
  }

  return await updateSupportInquiryStatus(config, {
    inquiryId,
    status,
    updatedBy: operatorUser.userId,
  });
}
