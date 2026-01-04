import { POCKETBASE_URL } from "../constants/config";

type FileUrlOptions = {
  thumb?: string;
};

export function pocketbaseFileUrl(
  collection: string,
  recordId: string,
  filename: string,
  options: FileUrlOptions = {},
) {
  const name = String(filename || "").trim();
  if (!collection || !recordId || !name) return "";

  const url = new URL(
    `/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(name)}`,
    POCKETBASE_URL,
  );

  if (options.thumb) url.searchParams.set("thumb", options.thumb);
  return url.toString();
}
