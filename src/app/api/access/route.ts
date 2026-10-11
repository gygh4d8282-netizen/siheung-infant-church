import { cookies } from "next/headers";
import { AppError, checkOrigin, db, fail, json, rateLimit } from "@/lib/server";
import { signSession, verifyPassword } from "@/lib/crypto";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await json(request);
    const space = body.space;
    if (!["teachers", "albums"].includes(space))
      throw new AppError("공간을 확인해 주세요.");
    const jar = await cookies();
    if (body.action === "lock") {
      jar.delete("church_" + space);
      return Response.json({ ok: true });
    }
    await rateLimit("unlock-" + space);
    if (typeof body.password !== "string" || body.password.length > 128)
      throw new AppError("비밀번호를 확인해 주세요.");
    const { data, error } = await db()
      .from("access_settings")
      .select("password_hash,version")
      .eq("space", space)
      .maybeSingle();
    if (error) throw new AppError("접근 설정을 확인하지 못했습니다.", 503);
    if (!data)
      throw new AppError(
        "아직 이용 준비 중입니다. 담당 교사에게 문의해 주세요.",
        503,
      );
    if (!(await verifyPassword(body.password, data.password_hash)))
      throw new AppError("비밀번호가 맞지 않습니다. 다시 입력해 주세요.", 401);
    jar.set(
      "church_" + space,
      signSession(space, data.version, process.env.SESSION_SECRET!),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 43200,
      },
    );
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
