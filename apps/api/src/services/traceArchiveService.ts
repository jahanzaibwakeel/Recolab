import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export async function archiveTraceExport(body: string, extension: string, metadata: {
  userId: string;
  itemId: string;
  algorithm: string;
  format: string;
}) {
  const directory = path.resolve(config.traceArchiveDir);
  await mkdir(directory, { recursive: true });
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `trace-${metadata.userId}-${metadata.itemId}-${metadata.algorithm}-${safeTimestamp}.${extension}`;
  const destination = path.join(directory, filename);
  await writeFile(destination, body, "utf8");
  return {
    storageMode: "local_file",
    path: destination,
    filename
  };
}
