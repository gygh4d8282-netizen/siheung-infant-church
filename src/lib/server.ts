import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createHmac } from "node:crypto";
import { verifySession } from "./crypto";
import type { Space } from "./types";
export const configured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length >= 32
  );
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function db() {
  if (!configured())
    throw new AppError(
      "저장 서비스 연결을 준비 중입니다. 운영자에게 문의해 주세요.",
      503,
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function auth() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components refresh through proxy. */
          }
        },
      },
    },
  );
}
export async function admin() {
  if (!configured()) return null;
  const client = await auth();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const { data, error: lookupError } = await db()
    .from("administrators")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (lookupError)
    throw new AppError(
      "관리 권한을 확인하지 못했습니다. 다시 시도해 주세요.",
      503,
    );
  return data ? user : null;
}
export async function requireAdmin() {
  const user = await admin();
  if (!user) throw new AppError("관리자 로그인이 필요합니다.", 401);
  return user;
}
export async function canRead(space: Space) {
  if (!configured()) return false;
  if (await admin()) return true;
  const token = (await cookies()).get("church_" + space)?.value;
  if (!token) return false;
  const { data, error } = await db()
    .from("access_settings")
    .select("version")
    .eq("space", space)
    .maybeSingle();
  if (error)
    throw new AppError("권한 확인에 실패했습니다. 다시 시도해 주세요.", 503);
  return (
    !!data &&
    verifySession(token, space, data.version, process.env.SESSION_SECRET!)
  );
}
export async function requireSpace(space: Space) {
  if (!(await canRead(space)))
    throw new AppError(
      "비밀번호를 다시 입력해 주세요. 이용 시간이 만료되었을 수 있습니다.",
      401,
    );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || "http://127.0.0.1:3000")
    .origin;
  if (origin !== expected)
    throw new AppError(
      "요청 출처를 확인할 수 없습니다. 홈페이지에서 다시 시도해 주세요.",
      403,
    );
}
export async function rateLimit(scope: string, limit = 5) {
  const client = db();
  const h = await headers();
  const ip = process.env.VERCEL
    ? h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local";
  const key = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(scope + ":" + ip)
    .digest("hex");
  const { data, error } = await client.rpc("consume_attempt", {
    p_key: key,
    p_limit: limit,
  });
  if (error)
    throw new AppError(
      "접근 확인이 일시적으로 어렵습니다. 잠시 후 다시 시도해 주세요.",
      503,
    );
  if (!data)
    throw new AppError("시도가 많습니다. 15분 후 다시 시도해 주세요.", 429);
}
export function fail(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  return Response.json(
    { error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}
export async function json(request: Request) {
  const raw = await request.text();
  if (raw.length > 100000) throw new AppError("입력 내용이 너무 큽니다.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("입력 형식을 확인해 주세요.");
  }
}
