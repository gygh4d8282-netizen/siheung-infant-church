import { settings } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { GardenArt } from "@/components/art";
export const metadata = { title: "영유아교회 소개" };
export default async function About() {
  const { data: s } = await settings();
  return (
    <div className="wrap page">
      <PageTitle
        eyebrow="WELCOME"
        title="처음 오셨나요?"
        description="영유아교회를 소개합니다. 함께할 만남을 기다립니다."
      />
      <div className="about-grid">
        <div className="prose">
          <h2>{s.name}</h2>
          <p>{s.welcome || "환영 인사를 준비하고 있습니다."}</p>
          <p>{s.introduction || "부서 소개를 준비하고 있습니다."}</p>
        </div>
        <GardenArt />
      </div>
      <dl className="info-grid">
        {[
          ["대상 연령", s.age],
          ["예배 시간", s.worship_time],
          ["예배 장소", s.worship_place],
        ].map(([title, value]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{value || "안내 준비 중입니다."}</dd>
          </div>
        ))}
      </dl>
      <section className="content-panel prose">
        <h2>첫 방문 안내</h2>
        <p>{s.first_visit || "참여 방법을 준비하고 있습니다."}</p>
        <h2>찾아오는 길</h2>
        <p>{s.directions || "찾아오는 방법을 준비하고 있습니다."}</p>
        <div className="actions">
          {s.map_url && (
            <a
              className="button secondary"
              href={s.map_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              공식 지도 보기 ↗
            </a>
          )}
          {s.contact_url && (
            <a
              className="button secondary"
              href={s.contact_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              공식 문의 창구 ↗
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
