"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Space } from "@/lib/types";
export function AccessGate({ space }: { space: Space }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const name = space === "teachers" ? "자료실" : "사진첩";
  return (
    <section className="gate">
      <div className="gate-icon" aria-hidden="true">
        ⌑
      </div>
      <h2>함께 나누는, 소중한 공간</h2>
      <p>
        {space === "teachers"
          ? "교사에게 안내받은 비밀번호를 입력해 주세요."
          : "사진첩 전용 비밀번호를 입력해 주세요."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = e.currentTarget;
          const password = String(new FormData(form).get("password"));
          form.reset();
          try {
            const r = await fetch("/api/access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ space, password }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="space-password">{name} 비밀번호</label>
        <input
          id="space-password"
          name="password"
          type="password"
          autoComplete="off"
          maxLength={128}
          required
        />
        <button disabled={busy}>
          {busy ? "확인 중…" : name + " 열기"} <span aria-hidden="true">→</span>
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <small>
        교사 자료실과 사진첩은 서로 다른 비밀번호를 사용합니다.
        <br />
        12시간 후에는 비밀번호를 다시 입력해 주세요.
      </small>
    </section>
  );
}
export function LockButton({ space }: { space: Space }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="secondary"
        onClick={async () => {
          try {
            const r = await fetch("/api/access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ space, action: "lock" }),
            });
            if (!r.ok) throw new Error();
            router.refresh();
          } catch {
            setError("잠금에 실패했습니다. 다시 시도해 주세요.");
          }
        }}
      >
        이 공간 잠그기 ↗
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
