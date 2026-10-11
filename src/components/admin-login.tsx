"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminLogin({
  reset,
  authError,
}: {
  reset: boolean;
  authError: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(reset ? "update" : "login");
  const [message, setMessage] = useState(
    authError
      ? "로그인 링크가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요."
      : "",
  );
  const [busy, setBusy] = useState(false);
  return (
    <section className="gate">
      <h2>
        {mode === "update"
          ? "새 비밀번호 설정"
          : mode === "reset"
            ? "비밀번호 재설정"
            : "교사 계정 로그인"}
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const form = e.currentTarget;
          const data = new FormData(form);
          const payload = {
            action: mode,
            email: data.get("email"),
            password: data.get("password"),
          };
          form.reset();
          try {
            const response = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            if (mode === "reset") setMessage(result.message);
            else {
              router.replace("/admin");
              if (mode === "update") {
                setMode("login");
                setMessage(
                  "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.",
                );
              }
              router.refresh();
            }
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "update" && (
          <label>
            이메일
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "update" ? "new-password" : "current-password"
              }
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        )}
        <button disabled={busy}>
          {busy
            ? "처리 중…"
            : mode === "login"
              ? "로그인"
              : mode === "reset"
                ? "재설정 이메일 요청"
                : "비밀번호 변경"}
        </button>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </form>
      {mode !== "update" && (
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "login" ? "reset" : "login");
            setMessage("");
          }}
        >
          {mode === "login" ? "비밀번호를 잊으셨나요?" : "로그인으로 돌아가기"}
        </button>
      )}
      <small>
        공개 회원가입은 제공하지 않습니다.
        <br />
        계정 초대는 운영 담당자에게 문의해 주세요.
      </small>
    </section>
  );
}
