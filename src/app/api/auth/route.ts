import {
  AppError,
  auth,
  checkOrigin,
  configured,
  db,
  fail,
  json,
  rateLimit,
  requireAdmin,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!configured())
      throw new AppError(
        "관리자 로그인은 Supabase 연결 후 이용할 수 있습니다.",
        503,
      );
    const body = await json(request);
    const client = await auth();
    if (body.action === "logout") {
      await client.auth.signOut();
      return Response.json({ ok: true });
    }
    await rateLimit("auth", 10);
    if (body.action === "reset") {
      if (typeof body.email !== "string" || body.email.length > 254)
        throw new AppError("이메일을 확인해 주세요.");
      await client.auth.resetPasswordForEmail(body.email, {
        redirectTo: new URL("/auth/confirm", process.env.APP_URL).href,
      });
      return Response.json({
        message: "등록된 이메일이면 재설정 안내를 받을 수 있습니다.",
      });
    }
    if (
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 128
    )
      throw new AppError("비밀번호는 12~128자로 입력해 주세요.");
    if (body.action === "update") {
      await requireAdmin();
      const { error } = await client.auth.updateUser({
        password: body.password,
      });
      if (error)
        throw new AppError(
          "비밀번호를 변경하지 못했습니다. 링크를 다시 요청해 주세요.",
        );
      await client.auth.signOut();
      return Response.json({ ok: true });
    }
    if (body.action !== "login" || typeof body.email !== "string")
      throw new AppError("로그인 정보를 확인해 주세요.");
    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || !data.user)
      throw new AppError("이메일 또는 비밀번호를 확인해 주세요.", 401);
    const { data: allowed } = await db()
      .from("administrators")
      .select("user_id")
      .eq("user_id", data.user.id)
      .eq("active", true)
      .maybeSingle();
    if (!allowed) {
      await client.auth.signOut();
      throw new AppError(
        "관리 권한이 없는 계정입니다. 운영자에게 문의해 주세요.",
        403,
      );
    }
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
