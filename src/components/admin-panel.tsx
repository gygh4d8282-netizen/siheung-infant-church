"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  categories,
  dateLabel,
  labels,
  type Asset,
  type Entry,
  type Kind,
  type Settings,
} from "@/lib/types";
async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "처리하지 못했습니다.");
  return result;
}
const infoLabels: Record<keyof Settings, string> = {
  name: "홈페이지 이름",
  welcome: "환영 인사",
  introduction: "부서 소개",
  age: "대상 연령",
  worship_time: "예배 요일·시간",
  worship_place: "예배 장소",
  first_visit: "첫 방문 참여 방법",
  directions: "찾아오는 방법",
  map_url: "공식 지도 링크 (선택)",
  contact_url: "공식 문의 링크 (선택)",
};
function toInput(value: string | null) {
  return value
    ? new Date(new Date(value).getTime() + 9 * 3600000)
        .toISOString()
        .slice(0, 16)
    : "";
}
export function AdminPanel({
  settings,
  settingsVersion,
  entries,
  assets,
}: {
  settings: Settings;
  settingsVersion: number;
  entries: Entry[];
  assets: Asset[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind | "settings" | "password">("settings");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const item = entries.find((e) => e.id === selected);
  const files = assets.filter((f) => f.entry_id === selected);
  const kind = tab as Kind;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await work();
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const select = (next: typeof tab) => {
    setTab(next);
    setSelected(null);
    setDeleting(null);
    setMessage("");
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>함께 가꾸는 영유아교회</h1>
          <p className="muted">모든 관리자 교사가 콘텐츠를 함께 관리합니다.</p>
        </div>
        <button
          disabled={busy}
          className="secondary"
          onClick={() =>
            run(async () => {
              await post("/api/auth", { action: "logout" });
              router.refresh();
            })
          }
        >
          로그아웃
        </button>
      </div>
      {(!settings.worship_time || !settings.worship_place || !settings.age) && (
        <div className="notice">
          기본 안내 입력이 필요합니다. 대상 연령과 실제 예배 시간·장소를 확인해
          주세요.
        </div>
      )}
      <nav className="admin-tabs" aria-label="관리 메뉴">
        {(
          [
            "settings",
            "news",
            "family",
            "teachers",
            "event",
            "album",
            "password",
          ] as const
        ).map((key) => (
          <button
            disabled={busy}
            key={key}
            aria-pressed={tab === key}
            onClick={() => select(key)}
          >
            {key === "settings"
              ? "기본 안내"
              : key === "password"
                ? "공용 비밀번호"
                : labels[key]}
          </button>
        ))}
      </nav>
      {message && (
        <div className="notice" role="status">
          {message}{" "}
          <button
            className="text-button"
            onClick={() => {
              router.refresh();
              setSelected(null);
            }}
          >
            최신 목록 다시 보기
          </button>
        </div>
      )}
      {tab === "settings" ? (
        <section className="content-panel">
          <h2>기본 안내 정보</h2>
          <form
            key={settingsVersion}
            onSubmit={(e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              void run(async () => {
                await post("/api/admin", {
                  action: "settings",
                  settings: data,
                  version: settingsVersion,
                });
                setMessage("기본 안내를 저장했습니다.");
              });
            }}
          >
            <fieldset disabled={busy} className="form-grid">
              {(Object.keys(infoLabels) as (keyof Settings)[]).map((key) => (
                <label
                  className={
                    [
                      "welcome",
                      "introduction",
                      "first_visit",
                      "directions",
                    ].includes(key)
                      ? "span-2"
                      : ""
                  }
                  key={key}
                >
                  {infoLabels[key]}
                  {[
                    "welcome",
                    "introduction",
                    "first_visit",
                    "directions",
                  ].includes(key) ? (
                    <textarea
                      name={key}
                      defaultValue={settings[key]}
                      rows={4}
                    />
                  ) : (
                    <input
                      name={key}
                      defaultValue={settings[key]}
                      required={key === "name"}
                      type={key.endsWith("_url") ? "url" : "text"}
                    />
                  )}
                </label>
              ))}
              <button className="span-2">안내 정보 저장</button>
            </fieldset>
          </form>
        </section>
      ) : tab === "password" ? (
        <section className="content-panel">
          <h2>공용 비밀번호 설정</h2>
          <p>
            12자 이상의 서로 다른 비밀번호를 사용해 주세요. 변경하면 해당 공간의
            기존 열람 세션이 종료됩니다. 이미 열린 파일 링크는 1분 이내
            만료됩니다.
          </p>
          <div className="two-columns">
            {(["teachers", "albums"] as const).map((space) => (
              <form
                key={space}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  if (data.get("password") !== data.get("confirm")) {
                    setMessage("비밀번호가 서로 일치하지 않습니다.");
                    form.reset();
                    return;
                  }
                  const password = data.get("password");
                  form.reset();
                  void run(async () => {
                    await post("/api/admin", {
                      action: "password",
                      space,
                      password,
                    });
                    setMessage(
                      "비밀번호를 변경했습니다. 안내받을 분들께 별도로 전달해 주세요.",
                    );
                  });
                }}
              >
                <h3>{space === "teachers" ? "교사 자료실" : "사진첩"}</h3>
                <label>
                  새 비밀번호
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
                <label>
                  새 비밀번호 확인
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
                <button disabled={busy}>비밀번호 변경</button>
              </form>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="section-heading">
            <h2>{labels[kind]} 관리</h2>
            <button
              disabled={busy}
              onClick={() => {
                setSelected("new");
                setDeleting(null);
              }}
            >
              새 항목 등록 ＋
            </button>
          </div>
          {selected !== null && (
            <section className="content-panel editor">
              <div className="section-heading">
                <h2>{item ? "내용 수정" : "새 항목"}</h2>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  편집 닫기
                </button>
              </div>
              <form
                key={
                  (item?.id || "new") + ":" + (item?.version || 0) + ":" + kind
                }
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const action =
                    (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                      "value",
                    ) || "draft";
                  const start = f.get("start_at");
                  const end = f.get("end_at");
                  const data = {
                    id: item?.id,
                    version: item?.version || 0,
                    kind,
                    title: f.get("title"),
                    body: f.get("body") || "",
                    summary: f.get("summary") || "",
                    category: f.get("category") || "",
                    activity_date: f.get("activity_date") || null,
                    start_at: start
                      ? new Date(String(start) + ":00+09:00").toISOString()
                      : null,
                    end_at: end
                      ? new Date(String(end) + ":00+09:00").toISOString()
                      : null,
                    all_day: f.get("all_day") === "on",
                    location: f.get("location") || "",
                    audience:
                      kind === "teachers"
                        ? "teachers"
                        : kind === "album"
                          ? "albums"
                          : kind === "event"
                            ? f.get("audience")
                            : "public",
                    important: f.get("important") === "on",
                    youtube: f.get("youtube") || "",
                    status: action,
                    reviewed: f.get("reviewed") === "on",
                    cover_id: f.get("cover_id") || null,
                  };
                  void run(async () => {
                    const result = await post("/api/admin", {
                      action: "save",
                      entry: data,
                    });
                    setSelected(result.id);
                    setMessage(
                      action === "published"
                        ? "게시했습니다."
                        : "초안으로 저장했습니다. 이용자에게는 보이지 않습니다.",
                    );
                  });
                }}
              >
                <fieldset disabled={busy} className="form-grid">
                  <label className="span-2">
                    제목
                    <input
                      name="title"
                      defaultValue={item?.title || ""}
                      maxLength={200}
                      required
                    />
                  </label>
                  {categories[kind].length > 0 && (
                    <label>
                      자료 종류
                      <select
                        name="category"
                        defaultValue={item?.category || ""}
                        required
                      >
                        <option value="" disabled>
                          종류 선택
                        </option>
                        {categories[kind].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {["teachers", "album"].includes(kind) && (
                    <label>
                      활동 기준 날짜
                      <input
                        name="activity_date"
                        type="date"
                        defaultValue={item?.activity_date || ""}
                        required
                      />
                    </label>
                  )}
                  {kind === "family" && (
                    <>
                      <label className="span-2">
                        짧은 소개
                        <textarea
                          name="summary"
                          maxLength={600}
                          defaultValue={item?.summary || ""}
                          rows={2}
                        />
                      </label>
                      <label className="span-2">
                        YouTube 링크 (선택)
                        <input
                          name="youtube"
                          type="url"
                          defaultValue={item?.youtube || ""}
                          placeholder="https://www.youtube.com/watch?v=…"
                        />
                      </label>
                    </>
                  )}
                  {kind === "event" && (
                    <>
                      <label>
                        시작 일시 (한국 시간)
                        <input
                          name="start_at"
                          type="datetime-local"
                          defaultValue={toInput(item?.start_at || null)}
                          required
                        />
                      </label>
                      <label>
                        종료 일시 (한국 시간)
                        <input
                          name="end_at"
                          type="datetime-local"
                          defaultValue={toInput(item?.end_at || null)}
                          required
                        />
                      </label>
                      <label className="checkbox">
                        <input
                          name="all_day"
                          type="checkbox"
                          defaultChecked={item?.all_day}
                        />
                        종일 일정
                      </label>
                      <label>
                        공개 범위
                        <select
                          name="audience"
                          defaultValue={item?.audience || ""}
                          required
                        >
                          <option value="" disabled>
                            반드시 선택해 주세요
                          </option>
                          <option value="public">공개</option>
                          <option value="teachers">교사 전용</option>
                        </select>
                      </label>
                      <label className="span-2">
                        장소
                        <input
                          name="location"
                          defaultValue={item?.location || ""}
                          maxLength={300}
                        />
                      </label>
                    </>
                  )}
                  <label className="span-2">
                    {kind === "album" || kind === "event"
                      ? "설명"
                      : "본문·설명"}
                    <textarea
                      name="body"
                      defaultValue={item?.body || ""}
                      rows={9}
                      maxLength={50000}
                    />
                  </label>
                  {kind === "news" && (
                    <label className="checkbox span-2">
                      <input
                        type="checkbox"
                        name="important"
                        defaultChecked={item?.important}
                      />
                      중요 공지로 표시
                    </label>
                  )}
                  {kind === "album" && files.length > 0 && (
                    <label className="span-2">
                      대표 사진
                      <select
                        name="cover_id"
                        defaultValue={item?.cover_id || ""}
                      >
                        <option value="">첫 번째 사진</option>
                        {files.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.alt || f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {["family", "teachers", "album"].includes(kind) && (
                    <label className="checkbox review-check span-2">
                      <input name="reviewed" type="checkbox" />
                      {kind === "album"
                        ? "게시할 모든 사진과 설명을 확인했습니다. 아이의 얼굴·실명·이름표·연락처·주소가 포함되어 있지 않습니다."
                        : "이번 수정 내용을 포함해 성경·교리 내용을 교사가 검토했습니다."}
                    </label>
                  )}
                  <p className="muted span-2">
                    {item
                      ? `최종 수정: ${dateLabel(item.updated_at, true)} · 버전 ${item.version}`
                      : "먼저 초안으로 저장한 다음 첨부파일이나 사진을 추가할 수 있습니다."}
                  </p>
                  <div className="actions span-2">
                    <button value="draft" className="secondary">
                      {item?.status === "published"
                        ? "게시 취소하고 초안 저장"
                        : "초안 저장"}
                    </button>
                    <button value="published">검토 후 게시</button>
                  </div>
                </fieldset>
              </form>
              {item && (
                <section className="upload-section">
                  <h3>{kind === "album" ? "사진" : "첨부파일"} 관리</h3>
                  <p className="muted">
                    위 내용을 먼저 저장해 주세요. 파일 변경 후에는 초안으로
                    전환되며 게시 전 재확인이 필요합니다.{" "}
                    {kind === "album"
                      ? "사진은 1장당 10MB 이하입니다."
                      : "자료는 1개당 20MB 이하입니다."}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const data = new FormData(form);
                      const selectedFiles = (
                        data.getAll("files") as File[]
                      ).filter((f) => f.size);
                      const alt = String(data.get("alt") || "");
                      void run(async () => {
                        let version = item.version;
                        let count = 0;
                        for (const file of selectedFiles) {
                          setMessage(
                            `${count + 1}/${selectedFiles.length} 파일 확인 및 저장 중…`,
                          );
                          const init = await post("/api/uploads", {
                            action: "start",
                            entry_id: item.id,
                            version,
                            name: file.name,
                            size: file.size,
                            alt,
                          });
                          const client = createClient(init.url, init.key, {
                            auth: {
                              persistSession: false,
                              autoRefreshToken: false,
                            },
                          });
                          const { error } = await client.storage
                            .from("upload-quarantine")
                            .uploadToSignedUrl(init.path, init.token, file);
                          if (error)
                            throw new Error(
                              "파일 전송에 실패했습니다. 저장된 파일을 확인한 뒤 다시 시도해 주세요.",
                            );
                          const result = await post("/api/uploads", {
                            action: "finish",
                            intent: init.intent,
                          });
                          version = result.version;
                          count++;
                        }
                        form.reset();
                        setMessage(
                          `${count}개 파일을 저장했습니다. 대체 설명을 확인하고 다시 게시해 주세요.`,
                        );
                      });
                    }}
                  >
                    <fieldset disabled={busy}>
                      {kind === "album" && (
                        <label>
                          사진 대체 설명 (추가 후 사진별로 수정 가능)
                          <input
                            name="alt"
                            maxLength={500}
                            required
                            placeholder="사진 속 작품이나 공간을 간단히 설명해 주세요"
                          />
                        </label>
                      )}
                      <label>
                        {kind === "album"
                          ? "사진 여러 장 선택"
                          : "첨부파일 선택"}
                        <input
                          type="file"
                          name="files"
                          multiple
                          accept={
                            kind === "album"
                              ? ".jpg,.jpeg,.png,.webp"
                              : ".pdf,.jpg,.jpeg,.png,.webp,.hwp,.hwpx,.docx,.pptx,.xlsx"
                          }
                          required
                        />
                      </label>
                      <button className="secondary">선택한 파일 올리기</button>
                    </fieldset>
                  </form>
                  <div className="admin-files">
                    {files.map((f) => (
                      <div key={f.id} className="admin-file">
                        {f.is_photo && (
                          <img
                            src={"/api/files/" + f.id + "?thumb=1"}
                            alt={f.alt}
                          />
                        )}
                        <a href={"/api/files/" + f.id + "?download=1"}>
                          {f.name} ↓
                        </a>
                        <form
                          key={f.id + item.version}
                          onSubmit={(e) => {
                            e.preventDefault();
                            const alt = String(
                              new FormData(e.currentTarget).get("alt") || "",
                            );
                            const remove =
                              (
                                e.nativeEvent as SubmitEvent
                              ).submitter?.getAttribute("value") === "remove";
                            if (
                              remove &&
                              !window.confirm(`“${f.name}” 파일을 삭제할까요?`)
                            )
                              return;
                            void run(async () => {
                              await post("/api/admin", {
                                action: "asset",
                                id: f.id,
                                version: item.version,
                                alt,
                                remove,
                              });
                              setMessage(
                                "파일 정보를 변경했습니다. 게시 전 다시 확인해 주세요.",
                              );
                            });
                          }}
                        >
                          <label>
                            {f.is_photo ? "사진 대체 설명" : "파일 설명"}
                            <input
                              name="alt"
                              defaultValue={f.alt}
                              maxLength={500}
                              required={f.is_photo}
                            />
                          </label>
                          <div className="actions">
                            <button
                              disabled={busy}
                              className="secondary"
                              value="save"
                            >
                              설명 저장
                            </button>
                            <button
                              disabled={busy}
                              className="danger"
                              value="remove"
                              formNoValidate
                            >
                              파일 삭제
                            </button>
                          </div>
                        </form>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </section>
          )}
          {deleting && (
            <div className="delete-confirm" role="alert">
              <h3>“{deleting.title}”을 삭제할까요?</h3>
              <p>
                게시물과 관련 파일을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="actions">
                <button
                  disabled={busy}
                  className="danger"
                  onClick={() =>
                    run(async () => {
                      await post("/api/admin", {
                        action: "delete",
                        id: deleting.id,
                        version: deleting.version,
                      });
                      setDeleting(null);
                      if (selected === deleting.id) setSelected(null);
                      setMessage("삭제했습니다.");
                    })
                  }
                >
                  삭제 확인
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setDeleting(null)}
                >
                  취소
                </button>
              </div>
            </div>
          )}
          <div className="admin-list">
            {entries
              .filter((e) => e.kind === kind)
              .map((e) => (
                <div key={e.id}>
                  <div>
                    <span
                      className={"tag " + (e.status === "draft" ? "draft" : "")}
                    >
                      {e.status === "draft" ? "초안" : "게시 중"}
                    </span>
                    <h3>{e.title}</h3>
                    <small>
                      {dateLabel(e.updated_at, true)}
                      {e.kind === "event"
                        ? " · " +
                          (e.audience === "teachers" ? "교사 전용" : "공개")
                        : ""}
                    </small>
                  </div>
                  <div className="actions">
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setSelected(e.id);
                        setDeleting(null);
                      }}
                    >
                      수정
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => setDeleting(e)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            {!entries.some((e) => e.kind === kind) && (
              <p className="empty">
                아직 등록된 항목이 없습니다. 새 항목을 등록해 주세요.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
