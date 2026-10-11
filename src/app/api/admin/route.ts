import {
  AppError,
  checkOrigin,
  db,
  fail,
  json,
  requireAdmin,
} from "@/lib/server";
import { entrySchema, passwordSchema, settingsSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { cleanupFiles } from "@/lib/cleanup";
import { createHmac } from "node:crypto";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireAdmin();
    const body = await json(request);
    const client = db();
    let result;
    if (body.action === "save") {
      const parsed = entrySchema.safeParse(body.entry);
      if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
      result = await client.rpc("save_entry", {
        p_data: parsed.data,
        p_actor: user.id,
      });
    } else if (body.action === "delete") {
      result = await client.rpc("delete_entry", {
        p_id: body.id,
        p_version: body.version,
        p_actor: user.id,
      });
    } else if (body.action === "settings") {
      const parsed = settingsSchema.safeParse(body.settings);
      if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
      result = await client.rpc("save_settings", {
        p_data: parsed.data,
        p_version: body.version,
        p_actor: user.id,
      });
    } else if (body.action === "password") {
      if (!["teachers", "albums"].includes(body.space))
        throw new AppError("공간을 확인해 주세요.");
      const parsed = passwordSchema.safeParse(body.password);
      if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
      const { data: other } = await client
        .from("access_settings")
        .select("password_hash")
        .eq("space", body.space === "teachers" ? "albums" : "teachers")
        .maybeSingle();
      if (other && (await verifyPassword(parsed.data, other.password_hash)))
        throw new AppError("두 공간은 서로 다른 비밀번호를 사용해 주세요.");
      result = await client.rpc("rotate_password", {
        p_space: body.space,
        p_hash: await hashPassword(parsed.data),
        p_actor: user.id,
        p_fingerprint: createHmac("sha256", process.env.SESSION_SECRET!)
          .update("password-equality:" + parsed.data)
          .digest("hex"),
      });
    } else if (body.action === "asset") {
      if (typeof body.alt !== "string" || body.alt.length > 500)
        throw new AppError("사진 설명을 500자 이내로 입력해 주세요.");
      result = await client.rpc("edit_asset", {
        p_id: body.id,
        p_version: body.version,
        p_alt: body.alt,
        p_remove: !!body.remove,
        p_actor: user.id,
      });
    } else throw new AppError("지원하지 않는 요청입니다.");
    if (result.error) {
      if (result.error.code === "23505" && body.action === "password")
        throw new AppError("두 공간은 서로 다른 비밀번호를 사용해 주세요.");
      if (result.error.message.includes("CONFLICT"))
        throw new AppError(
          "다른 교사가 수정했습니다. 화면을 새로 열어 최신 내용을 확인해 주세요.",
          409,
        );
      if (result.error.message.includes("PHOTO_REQUIRED"))
        throw new AppError("사진을 먼저 추가한 뒤 게시해 주세요.");
      throw new AppError(
        "저장하지 못했습니다. 입력 내용과 연결 상태를 확인해 주세요.",
      );
    }
    const cleanupPending = await cleanupFiles();
    return Response.json({ ok: true, id: result.data, cleanupPending });
  } catch (e) {
    return fail(e);
  }
}
