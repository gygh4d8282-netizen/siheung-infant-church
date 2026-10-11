import { NextResponse } from "next/server";
import { auth, configured } from "@/lib/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (configured()) {
    const client = await auth();
    const hash = url.searchParams.get("token_hash");
    const code = url.searchParams.get("code");
    let ok = false;
    if (hash) {
      const type = url.searchParams.get("type");
      if (type === "recovery" || type === "invite") {
        const { error } = await client.auth.verifyOtp({
          token_hash: hash,
          type,
        });
        ok = !error;
      }
    } else if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      ok = !error;
    }
    if (ok)
      return NextResponse.redirect(
        new URL("/admin?reset=1", process.env.APP_URL),
      );
  }
  return NextResponse.redirect(
    new URL("/admin?authError=1", process.env.APP_URL || url.origin),
  );
}
