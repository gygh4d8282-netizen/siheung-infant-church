import Link from "next/link";
import { settings, entries } from "@/lib/data";
import { dateLabel } from "@/lib/types";
import { GardenArt } from "@/components/art";
import { Empty } from "@/components/ui";
export default async function Home() {
  const [{ data: info }, news, events] = await Promise.all([
    settings(),
    entries("news"),
    entries("event"),
  ]);
  const latest = news
    .sort((a, b) => Number(b.important) - Number(a.important))
    .slice(0, 3);
  const upcoming = events
    .filter((e) => new Date(e.end_at!) >= new Date())
    .slice(0, 3);
  return (
    <>
      <section className="home-hero wrap">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> {info.name}
          </span>
          <h1>
            작은 마음에
            <br />
            사랑이 <span>자라나요.</span>
          </h1>
          <p>
            {info.welcome ||
              "아이와 부모님이 함께하는 영유아교회.\n예배 안내와 우리 부서의 소식을 만나보세요."}
          </p>
          <Link className="button" href="/about">
            처음 오셨나요? <span>↗</span>
          </Link>
          <div className="hero-note">
            <span aria-hidden="true">✦</span> 작은 발걸음을 반갑게 맞이합니다
          </div>
        </div>
        <div className="hero-picture">
          <GardenArt />
          <span className="art-caption">함께 만나고, 함께 자라는 우리</span>
        </div>
      </section>
      <div className="wrap">
        <section className="worship-strip" aria-label="예배 안내">
          <div>
            <span className="round-icon" aria-hidden="true">
              ☀
            </span>
            <h2>우리의 예배</h2>
          </div>
          <div>
            <small>예배 시간</small>
            <strong>{info.worship_time || "안내 준비 중입니다"}</strong>
          </div>
          <div>
            <small>예배 장소</small>
            <strong>{info.worship_place || "안내 준비 중입니다"}</strong>
          </div>
          <Link href="/about">자세히 보기 ↗</Link>
        </section>
        <section className="home-columns">
          <div>
            <div className="section-heading">
              <div>
                <span className="eyebrow">OUR NEWS</span>
                <h2>우리 부서 이야기</h2>
              </div>
              <Link href="/news">전체 보기 ↗</Link>
            </div>
            {latest.length ? (
              <div className="home-news">
                {latest.map((n) => (
                  <Link key={n.id} href={"/news/" + n.id}>
                    <small>
                      {n.important ? "중요 공지" : "부서 소식"} ·{" "}
                      {dateLabel(n.published_at)}
                    </small>
                    <h3>{n.title}</h3>
                    <span>↗</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty text="아직 등록된 소식이 없습니다." />
            )}
          </div>
          <div>
            <div className="section-heading">
              <div>
                <span className="eyebrow">COMING UP</span>
                <h2>다가오는 만남</h2>
              </div>
              <Link href="/calendar">일정 보기 ↗</Link>
            </div>
            {upcoming.length ? (
              <div className="upcoming">
                {upcoming.map((e) => (
                  <Link key={e.id} href={"/calendar/" + e.id}>
                    <span className="date-tile">
                      {new Intl.DateTimeFormat("ko-KR", {
                        timeZone: "Asia/Seoul",
                        month: "short",
                      }).format(new Date(e.start_at!))}
                      <b>
                        {new Intl.DateTimeFormat("ko-KR", {
                          timeZone: "Asia/Seoul",
                          day: "numeric",
                        }).format(new Date(e.start_at!))}
                      </b>
                    </span>
                    <div>
                      <h3>{e.title}</h3>
                      <small>
                        {e.all_day ? "종일" : dateLabel(e.start_at, true)} ·{" "}
                        {e.location}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty text="아직 등록된 예정 일정이 없습니다." />
            )}
          </div>
        </section>
        <section className="quick-links" aria-label="바로가기">
          <Link href="/family" className="yellow">
            <span className="quick-icon" aria-hidden="true">
              ♫
            </span>
            <div>
              <small>집에서도 함께해요</small>
              <h2>가정 신앙 활동</h2>
              <p>말씀 · 찬양 · 활동지</p>
            </div>
            <b>↗</b>
          </Link>
          <Link href="/albums" className="blue">
            <span className="quick-icon" aria-hidden="true">
              ▧
            </span>
            <div>
              <small>우리의 소중한 순간</small>
              <h2>비공개 사진첩</h2>
              <p>안내받은 비밀번호로 만나요</p>
            </div>
            <b>↗</b>
          </Link>
        </section>
      </div>
    </>
  );
}
