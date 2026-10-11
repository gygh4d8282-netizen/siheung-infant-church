"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { dateLabel, localDate, type Entry } from "@/lib/types";
import { Empty } from "./ui";
export function Calendar({ items }: { items: Entry[] }) {
  const today = localDate(new Date().toISOString());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<"list" | "calendar">("list");
  useEffect(() => {
    setView(
      window.matchMedia("(min-width: 768px)").matches ? "calendar" : "list",
    );
  }, []);
  const [year, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  const shift = (delta: number) =>
    setMonth(
      new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7),
    );
  const forDate = (day: string) =>
    items.filter(
      (e) => localDate(e.start_at!) <= day && localDate(e.end_at!) >= day,
    );
  const monthItems = items.filter(
    (e) =>
      localDate(e.start_at!).slice(0, 7) <= month &&
      localDate(e.end_at!).slice(0, 7) >= month,
  );
  return (
    <>
      <div className="calendar-toolbar">
        <div className="actions">
          <button
            className="secondary"
            onClick={() => shift(-1)}
            aria-label="이전 달"
          >
            ←
          </button>
          <h2 aria-live="polite">
            {year}년 {m}월
          </h2>
          <button
            className="secondary"
            onClick={() => shift(1)}
            aria-label="다음 달"
          >
            →
          </button>
          <button
            className="text-button"
            onClick={() => setMonth(today.slice(0, 7))}
          >
            오늘
          </button>
        </div>
        <div className="segmented" aria-label="일정 보기 방식">
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            목록
          </button>
          <button
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            달력
          </button>
        </div>
      </div>
      {view === "list" ? (
        monthItems.length ? (
          <div className="entry-list">
            {monthItems.map((e) => (
              <Link className="entry-row" key={e.id} href={"/calendar/" + e.id}>
                <div>
                  <span className="tag">
                    {e.all_day ? "종일" : dateLabel(e.start_at, true)}
                  </span>
                  <h3>{e.title}</h3>
                  <p>{e.location}</p>
                </div>
                <span>{dateLabel(e.start_at)} ↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="이달에 등록된 일정이 없습니다." />
        )
      ) : (
        <div className="calendar-grid">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div className="day-label" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="day blank" key={"blank" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = `${month}-${String(i + 1).padStart(2, "0")}`;
            return (
              <div
                key={day}
                className={"day " + (day === today ? "today" : "")}
              >
                <span>{i + 1}</span>
                {forDate(day).map((e) => (
                  <Link href={"/calendar/" + e.id} key={e.id}>
                    {e.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <p className="muted">
        시간은 한국 시간 기준입니다. 교사 전용 일정은 교사 자료실에서 확인할 수
        있습니다.
      </p>
    </>
  );
}
