export type RecentReportImageRef = {
  fieldKey: string;
  label: string;
  s3Key: string;
  originalFileName: string;
  contentType: string;
};

export type RecentReport = {
  date: string;
  name: string;
  itemName: string;
  progress: string;
  inputContent: string;
  images?: RecentReportImageRef[];
};
