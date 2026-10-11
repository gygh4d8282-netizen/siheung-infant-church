import "server-only";
import { db } from "./server";
export async function cleanupFiles() {
  const client = db();
  const { data: queue } = await client
    .from("storage_deletions")
    .select("id,bucket,path")
    .limit(100);
  let failed = false;
  for (const file of queue || []) {
    const { error } = await client.storage
      .from(file.bucket)
      .remove([file.path]);
    if (!error)
      await client.from("storage_deletions").delete().eq("id", file.id);
    else failed = true;
  }
  const { data: expired } = await client
    .from("upload_intents")
    .select("id,path")
    .lt("created_at", new Date(Date.now() - 3 * 3600000).toISOString())
    .limit(100);
  for (const intent of expired || []) {
    const { error } = await client.storage
      .from("upload-quarantine")
      .remove([intent.path]);
    if (!error)
      await client.from("upload_intents").delete().eq("id", intent.id);
    else failed = true;
  }
  return failed;
}
