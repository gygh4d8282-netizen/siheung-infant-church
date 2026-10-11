"use client";
import { useState } from "react";
import { categories, type Entry } from "@/lib/types";
import { EntryList } from "./ui";
export function FilteredList({
  items,
  kind,
}: {
  items: Entry[];
  kind: "teachers" | "family";
}) {
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const years = [
    ...new Set(items.map((i) => i.activity_date?.slice(0, 4)).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const filtered = items.filter(
    (i) =>
      (!category || i.category === category) &&
      (!year || i.activity_date?.slice(0, 4) === year) &&
      (!month || i.activity_date?.slice(5, 7) === month),
  );
  return (
    <>
      <div className="filters">
        <label>
          자료 종류
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">전체 종류</option>
            {categories[kind].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {kind === "teachers" && (
          <>
            <label>
              활동 연도
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">전체 연도</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              활동 월
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">전체 월</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>
                    {i + 1}월
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          className="secondary"
          onClick={() => {
            setCategory("");
            setYear("");
            setMonth("");
          }}
        >
          필터 초기화
        </button>
      </div>
      <EntryList items={filtered} base={"/" + kind} />
    </>
  );
}
