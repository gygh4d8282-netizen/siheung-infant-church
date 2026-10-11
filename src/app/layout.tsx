import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import "./globals.css";
import { settings } from "@/lib/data";
export const metadata: Metadata = {
  title: {
    default: "시흥제일교회 영유아교회",
    template: "%s | 시흥제일교회 영유아교회",
  },
  description:
    "시흥제일교회 영유아교회의 예배 안내, 부서 소식과 가정 신앙 활동을 만나보세요.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: info } = await settings();
  return (
    <html lang="ko">
      <body>
        <a className="skip" href="#main">
          본문으로 바로가기
        </a>
        <Header name={info.name} />
        <main id="main">{children}</main>
        <footer>
          <div>
            <Link className="footer-brand" href="/">
              ✳ {info.name}
            </Link>
            <p>아이와 가정, 교회가 함께하는 공간</p>
          </div>
          <Link href="/admin">관리자 로그인 ↗</Link>
        </footer>
      </body>
    </html>
  );
}
