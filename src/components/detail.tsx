import Link from "next/link";
import { notFound } from "next/navigation";
import { entry, assets } from "@/lib/data";
import { canRead } from "@/lib/server";
import { dateLabel, labels, youtubeId, type Kind } from "@/lib/types";
import { AccessGate, LockButton } from "./access";
import { Gallery } from "./gallery";
export async function Detail({
  id,
  kind,
  base,
  teacherEvent = false,
}: {
  id: string;
  kind: Kind;
  base: string;
  teacherEvent?: boolean;
}) {
  const space =
    kind === "teachers" || teacherEvent
      ? "teachers"
      : kind === "album"
        ? "albums"
        : null;
  if (space && !(await canRead(space)))
    return (
      <div className="wrap page">
        <AccessGate space={space} />
      </div>
    );
  const item = await entry(id, kind, teacherEvent);
  if (
    !item ||
    (teacherEvent
      ? item.audience !== "teachers"
      : kind === "event" && item.audience !== "public")
  )
    notFound();
  const files = await assets(item);
  const video = youtubeId(item.youtube);
  return (
    <div className="wrap page detail">
      <div className="section-heading">
        <Link href={base}>
          ← {teacherEvent ? "교사 자료실" : labels[kind]} 목록
        </Link>
        {space && <LockButton space={space} />}
      </div>
      <header className="detail-heading">
        <span className="tag">{item.category || labels[kind]}</span>
        <h1>{item.title}</h1>
        <p>{dateLabel(item.activity_date || item.published_at)}</p>
      </header>
      {kind === "event" && (
        <dl className="info-grid">
          <div>
            <dt>시작</dt>
            <dd>
              {dateLabel(item.start_at, !item.all_day)}{" "}
              {item.all_day ? "종일" : ""}
            </dd>
          </div>
          <div>
            <dt>종료</dt>
            <dd>{dateLabel(item.end_at, !item.all_day)}</dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{item.location || "별도 안내 없음"}</dd>
          </div>
        </dl>
      )}
      {item.summary && <p className="lead">{item.summary}</p>}
      <div className="prose">{item.body}</div>
      {video && (
        <section className="section">
          <h2>함께 듣는 찬양</h2>
          <iframe
            className="video"
            src={"https://www.youtube-nocookie.com/embed/" + video}
            title={item.title + " 찬양 영상"}
            allowFullScreen
            loading="lazy"
          />
          <a href={item.youtube} rel="noopener noreferrer" target="_blank">
            원래 영상 보기 ↗
          </a>
        </section>
      )}
      {kind === "album" ? (
        <Gallery photos={files} />
      ) : (
        files.length > 0 && (
          <section className="attachments">
            <h2>첨부파일</h2>
            {files.map((f) => (
              <a key={f.id} href={"/api/files/" + f.id + "?download=1"}>
                {f.name}
                <span>{(f.size / 1024 / 1024).toFixed(1)}MB · 내려받기 ↓</span>
              </a>
            ))}
          </section>
        )
      )}
    </div>
  );
}
