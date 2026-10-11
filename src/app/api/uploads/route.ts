import { randomUUID } from "node:crypto";
import {
  AppError,
  checkOrigin,
  db,
  fail,
  json,
  rateLimit,
  requireAdmin,
} from "@/lib/server";
import { inspectUpload, uploadLimit } from "@/lib/uploads";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireAdmin();
    const body = await json(request);
    const client = db();
    if (body.action === "start") {
      await rateLimit("upload", 100);
      if (
        typeof body.name !== "string" ||
        body.name.length > 180 ||
        /[\\/\x00-\x1f]/.test(body.name) ||
        typeof body.alt !== "string" ||
        body.alt.length > 500 ||
        !Number.isSafeInteger(body.size)
      )
        throw new AppError("파일 이름과 설명을 확인해 주세요.");
      const { data: entry } = await client
        .from("entries")
        .select("id,kind,version")
        .eq("id", body.entry_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!entry) throw new AppError("자료를 먼저 저장해 주세요.");
      if (entry.version !== body.version)
        throw new AppError(
          "다른 교사가 수정했습니다. 최신 화면을 확인해 주세요.",
          409,
        );
      try {
        uploadLimit(body.name, entry.kind === "album", body.size);
      } catch (e) {
        throw new AppError((e as Error).message);
      }
      if (entry.kind === "album" && !body.alt.trim())
        throw new AppError("사진의 대체 설명을 입력해 주세요.");
      const path = user.id + "/" + randomUUID();
      const { data: intent, error } = await client
        .from("upload_intents")
        .insert({
          entry_id: entry.id,
          version: entry.version,
          owner_id: user.id,
          name: body.name,
          alt: body.alt,
          size: body.size,
          path,
        })
        .select("id")
        .single();
      if (error) throw new AppError("업로드를 준비하지 못했습니다.");
      const { data: signed, error: signError } = await client.storage
        .from("upload-quarantine")
        .createSignedUploadUrl(path);
      if (signError || !signed)
        throw new AppError("업로드 연결에 실패했습니다.");
      return Response.json({
        intent: intent.id,
        path,
        token: signed.token,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }
    if (body.action !== "finish") throw new AppError("요청을 확인해 주세요.");
    const { data: intent } = await client
      .from("upload_intents")
      .select("*,entries!inner(kind)")
      .eq("id", body.intent)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!intent || Date.now() - new Date(intent.created_at).getTime() > 3600000)
      throw new AppError("업로드 시간이 만료되었습니다. 다시 선택해 주세요.");
    const { data: blob, error: downloadError } = await client.storage
      .from("upload-quarantine")
      .download(intent.path);
    if (downloadError || !blob)
      throw new AppError("업로드 파일을 찾지 못했습니다. 다시 시도해 주세요.");
    if (blob.size !== intent.size) {
      await client.storage.from("upload-quarantine").remove([intent.path]);
      throw new AppError("파일 크기가 일치하지 않습니다.");
    }
    let clean;
    try {
      clean = await inspectUpload(
        Buffer.from(await blob.arrayBuffer()),
        intent.name,
        intent.entries.kind === "album",
      );
    } catch (e) {
      await client.storage.from("upload-quarantine").remove([intent.path]);
      throw new AppError(
        e instanceof Error ? e.message : "파일을 확인해 주세요.",
      );
    }
    const id = randomUUID();
    const bucket =
      intent.entries.kind === "album"
        ? "album-photos"
        : intent.entries.kind === "teachers"
          ? "teacher-materials"
          : "public-materials";
    const path = intent.entry_id + "/" + id + "." + clean.extension;
    const thumbPath = clean.thumb
      ? intent.entry_id + "/" + id + "-thumb.webp"
      : null;
    const paths = [path, ...(thumbPath ? [thumbPath] : [])];
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(path, clean.bytes, { contentType: clean.mime });
    if (uploadError) throw new AppError("파일 저장에 실패했습니다.");
    if (thumbPath && clean.thumb) {
      const { error } = await client.storage
        .from(bucket)
        .upload(thumbPath, clean.thumb, { contentType: "image/webp" });
      if (error) {
        await client.storage.from(bucket).remove(paths);
        throw new AppError("미리보기 저장에 실패했습니다.");
      }
    }
    const { error } = await client.rpc("attach_asset", {
      p_intent: intent.id,
      p_actor: user.id,
      p_asset: {
        id,
        name:
          clean.mime === "image/webp"
            ? intent.name.replace(/\.[^.]+$/, ".webp")
            : intent.name,
        bucket,
        path,
        thumb_path: thumbPath,
        mime: clean.mime,
        size: clean.bytes.length,
      },
    });
    await client.storage.from("upload-quarantine").remove([intent.path]);
    if (error) {
      await client.storage.from(bucket).remove(paths);
      throw new AppError(
        "다른 수정 또는 업로드와 겹쳤습니다. 최신 내용을 확인하고 다시 시도해 주세요.",
        409,
      );
    }
    return Response.json({ ok: true, version: intent.version + 1 });
  } catch (e) {
    return fail(e);
  }
}
