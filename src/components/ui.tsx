import Link from "next/link";
import type { Entry } from "@/lib/types";
import { dateLabel } from "@/lib/types";
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function Empty({
  text = "아직 등록된 자료가 없습니다.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <span aria-hidden="true">✳</span>
      <p>{text}</p>
      <small>새로운 소식이 준비되면 이곳에서 알려드릴게요.</small>
    </div>
  );
}
export function EntryList({ items, base }: { items: Entry[]; base: string }) {
  return items.length ? (
    <div className="entry-list">
      {items.map((item) => (
        <Link className="entry-row" key={item.id} href={`${base}/${item.id}`}>
          <div>
            <span className="tag">
              {item.important ? "중요 공지" : item.category || "소식"}
            </span>
            <h3>{item.title}</h3>
            {item.summary && <p>{item.summary}</p>}
          </div>
          <span className="entry-date">
            {dateLabel(item.activity_date || item.published_at)}{" "}
            <b aria-hidden="true">↗</b>
          </span>
        </Link>
      ))}
    </div>
  ) : (
    <Empty />
  );
}
