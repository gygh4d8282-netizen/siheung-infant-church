"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
const links = [
  ["/", "홈"],
  ["/about", "소개"],
  ["/news", "부서 소식"],
  ["/family", "가정 신앙 활동"],
  ["/teachers", "교사 자료실"],
  ["/calendar", "일정"],
  ["/albums", "사진첩"],
];
export function Header({
  name = "시흥제일교회 영유아교회",
}: {
  name?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label={name + " 홈"}>
          <span className="brand-icon" aria-hidden="true">
            ✳
          </span>
          <span>
            {name === "시흥제일교회 영유아교회" ? (
              <>
                <small>시흥제일교회</small>
                <strong>영유아교회</strong>
              </>
            ) : (
              <strong>{name}</strong>
            )}
          </span>
        </Link>
        <button
          className="menu-toggle secondary"
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? "메뉴 닫기" : "메뉴 열기"}
        </button>
        <nav id="main-menu" className={open ? "open" : ""} aria-label="주 메뉴">
          {links.map(([url, label]) => (
            <Link
              key={url}
              href={url}
              onClick={() => setOpen(false)}
              aria-current={
                (url === "/" ? path === "/" : path.startsWith(url))
                  ? "page"
                  : undefined
              }
            >
              {label}
              {["/teachers", "/albums"].includes(url) && (
                <span className="lock-dot" aria-label="비공개">
                  ↗
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
